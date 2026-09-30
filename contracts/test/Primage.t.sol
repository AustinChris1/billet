// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Primage} from "../src/Primage.sol";
import {MockTIP20} from "./MockTIP20.sol";

contract PrimageTest is Test {
    Primage internal lc;
    MockTIP20 internal usd;

    address internal buyer = makeAddr("buyer");
    uint256 internal supplierKey = 0xA11CE;
    address internal supplier = vm.addr(supplierKey);
    address internal attestor = makeAddr("attestor");
    address internal stranger = makeAddr("stranger");

    uint128 internal constant AMOUNT = 20_000e6;
    bytes32 internal constant SALT = keccak256("deal-1");
    bytes32 internal constant TERMS = keccak256("SC1 terms memo");
    bytes32 internal constant SHIPMENT = keccak256("salt|KOCU4221161");
    bytes32 internal constant EVIDENCE = keccak256("t49 webhook body");

    uint40 internal shipBy;
    uint40 internal arriveBy;

    function setUp() public {
        vm.warp(1_790_000_000);
        lc = new Primage();
        usd = new MockTIP20();
        usd.mint(buyer, 1_000_000e6);
        vm.prank(buyer);
        usd.approve(address(lc), type(uint256).max);
        shipBy = uint40(block.timestamp + 20 days);
        arriveBy = uint40(block.timestamp + 60 days);
    }

    function _terms() internal view returns (Primage.Terms memory) {
        return Primage.Terms({
            supplier: supplier,
            attestor: attestor,
            token: address(usd),
            amount: AMOUNT,
            dispatchBps: 8_000,
            shipBy: shipBy,
            arriveBy: arriveBy,
            termsHash: TERMS
        });
    }

    function _open() internal returns (bytes32 id) {
        vm.prank(buyer);
        id = lc.open(SALT, _terms());
    }

    function _openAndBind() internal returns (bytes32 id) {
        id = _open();
        vm.prank(supplier);
        lc.bindShipment(id, SHIPMENT);
    }

    function test_open_locksFundsUnderDeterministicId() public {
        bytes32 id = _open();
        assertEq(id, lc.creditId(buyer, SALT));
        assertEq(usd.balanceOf(address(lc)), AMOUNT);

        Primage.Credit memory c = lc.credit(id);
        assertEq(c.buyer, buyer);
        assertEq(c.supplier, supplier);
        assertEq(c.termsHash, TERMS);
        assertEq(uint8(c.stage), uint8(Primage.Stage.Open));
    }

    function test_open_rejectsReusedId() public {
        _open();
        vm.prank(buyer);
        vm.expectRevert(Primage.CreditExists.selector);
        lc.open(SALT, _terms());
    }

    function test_open_rejectsAttestorControlledByEitherSide() public {
        Primage.Terms memory t = _terms();
        t.attestor = supplier;
        vm.prank(buyer);
        vm.expectRevert(Primage.InvalidTerms.selector);
        lc.open(SALT, t);

        t.attestor = buyer;
        vm.prank(buyer);
        vm.expectRevert(Primage.InvalidTerms.selector);
        lc.open(SALT, t);
    }

    function test_open_rejectsBadDates() public {
        Primage.Terms memory t = _terms();
        t.arriveBy = t.shipBy;
        vm.prank(buyer);
        vm.expectRevert(Primage.InvalidTerms.selector);
        lc.open(SALT, t);
    }

    function test_happyPath_paysSupplierInTwoTranches() public {
        bytes32 id = _openAndBind();

        vm.warp(block.timestamp + 5 days);
        vm.prank(attestor);
        lc.attestDispatched(id, uint40(block.timestamp - 1 hours), EVIDENCE);
        assertEq(usd.balanceOf(supplier), 16_000e6);

        vm.warp(block.timestamp + 30 days);
        vm.prank(attestor);
        lc.attestDelivered(id, uint40(block.timestamp - 1 hours), EVIDENCE);
        assertEq(usd.balanceOf(supplier), AMOUNT);
        assertEq(usd.balanceOf(address(lc)), 0);
        assertEq(uint8(lc.credit(id).stage), uint8(Primage.Stage.Closed));
    }

    function test_fullTrancheOnLoading_closesImmediately() public {
        Primage.Terms memory t = _terms();
        t.dispatchBps = 10_000;
        vm.prank(buyer);
        bytes32 id = lc.open(SALT, t);
        vm.prank(supplier);
        lc.bindShipment(id, SHIPMENT);

        vm.prank(attestor);
        lc.attestDispatched(id, uint40(block.timestamp), EVIDENCE);
        assertEq(usd.balanceOf(supplier), AMOUNT);
        assertEq(uint8(lc.credit(id).stage), uint8(Primage.Stage.Closed));
    }

    function test_attest_requiresNamedAttestor() public {
        bytes32 id = _openAndBind();
        vm.prank(stranger);
        vm.expectRevert(Primage.NotAttestor.selector);
        lc.attestDispatched(id, uint40(block.timestamp), EVIDENCE);
    }

    function test_attest_requiresBoundContainer() public {
        bytes32 id = _open();
        vm.prank(attestor);
        vm.expectRevert(Primage.NoShipment.selector);
        lc.attestDispatched(id, uint40(block.timestamp), EVIDENCE);
    }

    function test_attest_rejectsLoadingAfterLatestShipmentDate() public {
        bytes32 id = _openAndBind();
        vm.warp(shipBy + 2 days);
        vm.prank(attestor);
        vm.expectRevert(Primage.EventTooLate.selector);
        lc.attestDispatched(id, shipBy + 1, EVIDENCE);
    }

    function test_attest_acceptsOnTimeLoadingReportedLate() public {
        bytes32 id = _openAndBind();
        vm.warp(shipBy + 2 days);
        vm.prank(attestor);
        lc.attestDispatched(id, shipBy - 1, EVIDENCE);
        assertEq(usd.balanceOf(supplier), 16_000e6);
    }

    function test_attest_rejectsFutureEventAndEmptyEvidence() public {
        bytes32 id = _openAndBind();
        vm.startPrank(attestor);
        vm.expectRevert(Primage.EventInFuture.selector);
        lc.attestDispatched(id, uint40(block.timestamp + 1), EVIDENCE);
        vm.expectRevert(Primage.NoEvidence.selector);
        lc.attestDispatched(id, uint40(block.timestamp), bytes32(0));
        vm.stopPrank();
    }

    function test_attest_arrivedBeforeLoadedIsWrongStage() public {
        bytes32 id = _openAndBind();
        vm.prank(attestor);
        vm.expectRevert(Primage.WrongStage.selector);
        lc.attestDelivered(id, uint40(block.timestamp), EVIDENCE);
    }

    function test_bind_onlySupplierAndOnlyOnce() public {
        bytes32 id = _open();
        vm.prank(stranger);
        vm.expectRevert(Primage.NotSupplier.selector);
        lc.bindShipment(id, SHIPMENT);

        vm.prank(supplier);
        lc.bindShipment(id, SHIPMENT);
        vm.prank(supplier);
        vm.expectRevert(Primage.ShipmentAlreadyBound.selector);
        lc.bindShipment(id, keccak256("other"));
    }

    function test_bindBySig_relayedByAnyone() public {
        bytes32 id = _open();
        bytes32 digest = _bindDigest(id, SHIPMENT);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(supplierKey, digest);

        vm.prank(stranger);
        lc.bindShipmentBySig(id, SHIPMENT, abi.encodePacked(r, s, v));
        assertEq(lc.credit(id).shipmentHash, SHIPMENT);
    }

    function test_bindBySig_rejectsOtherSigner() public {
        bytes32 id = _open();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xB0B, _bindDigest(id, SHIPMENT));
        vm.expectRevert(Primage.BadSignature.selector);
        lc.bindShipmentBySig(id, SHIPMENT, abi.encodePacked(r, s, v));
    }

    function test_refund_afterShipByPlusGrace() public {
        bytes32 id = _openAndBind();
        vm.warp(shipBy + lc.GRACE());
        vm.expectRevert(Primage.NotRefundable.selector);
        lc.refund(id);

        vm.warp(shipBy + lc.GRACE() + 1);
        vm.prank(stranger);
        lc.refund(id);
        assertEq(usd.balanceOf(buyer), 1_000_000e6);
        assertEq(usd.balanceOf(supplier), 0);
    }

    function test_refund_remainderAfterArriveByPlusGrace() public {
        bytes32 id = _openAndBind();
        vm.prank(attestor);
        lc.attestDispatched(id, uint40(block.timestamp), EVIDENCE);

        vm.warp(arriveBy + lc.GRACE() + 1);
        lc.refund(id);
        assertEq(usd.balanceOf(supplier), 16_000e6);
        assertEq(usd.balanceOf(buyer), 1_000_000e6 - 16_000e6);
    }

    function test_release_byBuyerOnly() public {
        bytes32 id = _open();
        vm.prank(stranger);
        vm.expectRevert(Primage.NotBuyer.selector);
        lc.release(id);

        vm.prank(buyer);
        lc.release(id);
        assertEq(usd.balanceOf(supplier), AMOUNT);
    }

    function test_decline_bySupplierRefundsBuyer() public {
        bytes32 id = _open();
        vm.prank(supplier);
        lc.decline(id);
        assertEq(usd.balanceOf(buyer), 1_000_000e6);
        assertEq(uint8(lc.credit(id).stage), uint8(Primage.Stage.Closed));
    }

    function test_closedCreditCannotMoveAgain() public {
        bytes32 id = _open();
        vm.prank(buyer);
        lc.release(id);

        vm.prank(supplier);
        vm.expectRevert(Primage.WrongStage.selector);
        lc.decline(id);
        vm.warp(arriveBy + lc.GRACE() + 1);
        vm.expectRevert(Primage.WrongStage.selector);
        lc.refund(id);
    }

    function test_openWithPermit_singleTransaction() public {
        uint256 ownerKey = 0xB0B;
        address owner = vm.addr(ownerKey);
        usd.mint(owner, AMOUNT);
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                owner,
                address(lc),
                uint256(AMOUNT),
                usd.nonces(owner),
                deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", usd.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerKey, digest);

        vm.prank(owner);
        bytes32 id = lc.openWithPermit(SALT, _terms(), deadline, v, r, s);
        assertEq(usd.balanceOf(address(lc)), AMOUNT);
        assertEq(id, lc.creditId(owner, SALT));
    }

    /// @dev Whatever the path, the escrow's money only ever ends up with the buyer or the supplier.
    function testFuzz_fundsOnlyReachBuyerOrSupplier(uint16 bps, uint8 path, uint32 skew) public {
        bps = uint16(bound(bps, 0, 10_000));
        Primage.Terms memory t = _terms();
        t.dispatchBps = bps;
        vm.prank(buyer);
        bytes32 id = lc.open(SALT, t);
        vm.prank(supplier);
        lc.bindShipment(id, SHIPMENT);

        uint256 p = path % 4;
        if (p == 0) {
            vm.prank(attestor);
            lc.attestDispatched(id, uint40(block.timestamp), EVIDENCE);
            if (bps < 10_000) {
                vm.warp(block.timestamp + 1 + (skew % 30 days));
                vm.prank(attestor);
                lc.attestDelivered(id, uint40(block.timestamp), EVIDENCE);
            }
        } else if (p == 1) {
            vm.prank(attestor);
            lc.attestDispatched(id, uint40(block.timestamp), EVIDENCE);
            if (bps < 10_000) {
                vm.warp(arriveBy + lc.GRACE() + 1 + skew);
                lc.refund(id);
            }
        } else if (p == 2) {
            vm.warp(shipBy + lc.GRACE() + 1 + skew);
            lc.refund(id);
        } else {
            vm.prank(supplier);
            lc.decline(id);
        }

        assertEq(usd.balanceOf(address(lc)), 0);
        assertEq(usd.balanceOf(buyer) + usd.balanceOf(supplier), 1_000_000e6);
        assertEq(usd.balanceOf(attestor), 0);
        assertEq(usd.balanceOf(stranger), 0);
    }

    function _bindDigest(bytes32 id, bytes32 shipmentHash) internal view returns (bytes32) {
        (, string memory name, string memory version, uint256 chainId, address verifying,,) = lc.eip712Domain();
        bytes32 domain = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name)),
                keccak256(bytes(version)),
                chainId,
                verifying
            )
        );
        bytes32 structHash =
            keccak256(abi.encode(keccak256("BindShipment(bytes32 id,bytes32 shipmentHash)"), id, shipmentHash));
        return keccak256(abi.encodePacked("\x19\x01", domain, structHash));
    }
}
