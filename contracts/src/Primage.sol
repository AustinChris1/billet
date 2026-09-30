// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ITIP20} from "./ITIP20.sol";

/// @title Primage
/// @notice A letter of credit for stablecoin payments. The buyer locks TIP-20 dollars against one
/// shipment; the named attestor releases them in two tranches on carrier tracking events (dispatched, then
/// delivered). Funds can only ever leave to the credit's supplier or back to its buyer.
contract Primage is EIP712 {
    uint256 public constant GRACE = 3 days;
    uint16 public constant BPS = 10_000;

    enum Stage {
        None,
        Open,
        Dispatched,
        Closed
    }

    struct Terms {
        address supplier;
        address attestor;
        address token;
        uint128 amount;
        uint16 dispatchBps;
        uint40 shipBy;
        uint40 arriveBy;
        bytes32 termsHash;
    }

    struct Credit {
        address buyer;
        uint40 shipBy;
        uint40 arriveBy;
        uint16 dispatchBps;
        Stage stage;
        address supplier;
        address attestor;
        address token;
        uint128 amount;
        uint128 settled;
        bytes32 termsHash;
        bytes32 shipmentHash;
    }

    bytes32 private constant BIND_TYPEHASH = keccak256("BindShipment(bytes32 id,bytes32 shipmentHash)");

    mapping(bytes32 id => Credit) private _credits;

    event Opened(
        bytes32 indexed id,
        address indexed buyer,
        address indexed supplier,
        address attestor,
        address token,
        uint256 amount,
        uint16 dispatchBps,
        uint40 shipBy,
        uint40 arriveBy,
        bytes32 termsHash
    );
    event ShipmentBound(bytes32 indexed id, bytes32 shipmentHash);
    event Dispatched(bytes32 indexed id, uint40 eventTime, bytes32 evidenceHash, uint256 paid);
    event Delivered(bytes32 indexed id, uint40 eventTime, bytes32 evidenceHash, uint256 paid);
    event ReleasedByBuyer(bytes32 indexed id, uint256 paid);
    event DeclinedBySupplier(bytes32 indexed id, uint256 refunded);
    event Refunded(bytes32 indexed id, uint256 refunded);

    error InvalidTerms();
    error CreditExists();
    error WrongStage();
    error NotBuyer();
    error NotSupplier();
    error NotAttestor();
    error NoShipment();
    error ShipmentAlreadyBound();
    error BadSignature();
    error EventTooLate();
    error EventInFuture();
    error NoEvidence();
    error NotRefundable();
    error TransferFailed();

    constructor() EIP712("Primage", "1") {}

    function creditId(address buyer, bytes32 salt) public pure returns (bytes32) {
        return keccak256(abi.encode(buyer, salt));
    }

    function credit(bytes32 id) external view returns (Credit memory) {
        return _credits[id];
    }

    function open(bytes32 salt, Terms calldata t) external returns (bytes32 id) {
        id = _open(salt, t);
    }

    function openWithPermit(bytes32 salt, Terms calldata t, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
        external
        returns (bytes32 id)
    {
        // A front-run permit still leaves the allowance in place, so a failed permit is not fatal.
        try ITIP20(t.token).permit(msg.sender, address(this), t.amount, deadline, v, r, s) {} catch {}
        id = _open(salt, t);
    }

    function bindShipment(bytes32 id, bytes32 shipmentHash) external {
        if (msg.sender != _credits[id].supplier) revert NotSupplier();
        _bind(id, shipmentHash);
    }

    /// @notice Lets a supplier with no fee tokens sign the binding while anyone relays it.
    function bindShipmentBySig(bytes32 id, bytes32 shipmentHash, bytes calldata signature) external {
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(BIND_TYPEHASH, id, shipmentHash)));
        if (ECDSA.recover(digest, signature) != _credits[id].supplier) revert BadSignature();
        _bind(id, shipmentHash);
    }

    function attestDispatched(bytes32 id, uint40 eventTime, bytes32 evidenceHash) external {
        Credit storage c = _credits[id];
        _checkAttestation(c, Stage.Open, eventTime, c.shipBy, evidenceHash);

        uint128 pay = uint128((uint256(c.amount) * c.dispatchBps) / BPS);
        c.settled = pay;
        c.stage = c.dispatchBps == BPS ? Stage.Closed : Stage.Dispatched;
        emit Dispatched(id, eventTime, evidenceHash, pay);
        _send(c.token, c.supplier, pay, id);
    }

    function attestDelivered(bytes32 id, uint40 eventTime, bytes32 evidenceHash) external {
        Credit storage c = _credits[id];
        _checkAttestation(c, Stage.Dispatched, eventTime, c.arriveBy, evidenceHash);

        uint128 pay = c.amount - c.settled;
        c.settled = c.amount;
        c.stage = Stage.Closed;
        emit Delivered(id, eventTime, evidenceHash, pay);
        _send(c.token, c.supplier, pay, id);
    }

    function release(bytes32 id) external {
        Credit storage c = _credits[id];
        if (msg.sender != c.buyer) revert NotBuyer();
        uint128 pay = _close(c);
        emit ReleasedByBuyer(id, pay);
        _send(c.token, c.supplier, pay, id);
    }

    function decline(bytes32 id) external {
        Credit storage c = _credits[id];
        if (msg.sender != c.supplier) revert NotSupplier();
        uint128 back = _close(c);
        emit DeclinedBySupplier(id, back);
        _send(c.token, c.buyer, back, id);
    }

    /// @notice Anyone may trigger a refund once a deadline plus the grace window has passed.
    function refund(bytes32 id) external {
        Credit storage c = _credits[id];
        uint256 deadline;
        if (c.stage == Stage.Open) deadline = c.shipBy;
        else if (c.stage == Stage.Dispatched) deadline = c.arriveBy;
        else revert WrongStage();
        if (block.timestamp <= deadline + GRACE) revert NotRefundable();

        uint128 back = _close(c);
        emit Refunded(id, back);
        _send(c.token, c.buyer, back, id);
    }

    function _open(bytes32 salt, Terms calldata t) internal returns (bytes32 id) {
        if (
            t.supplier == address(0) || t.supplier == msg.sender || t.attestor == address(0)
                || t.attestor == msg.sender || t.attestor == t.supplier || t.token == address(0) || t.amount == 0
                || t.dispatchBps > BPS || t.shipBy <= block.timestamp || t.arriveBy <= t.shipBy || t.termsHash == 0
        ) revert InvalidTerms();

        id = creditId(msg.sender, salt);
        Credit storage c = _credits[id];
        if (c.stage != Stage.None) revert CreditExists();

        c.buyer = msg.sender;
        c.shipBy = t.shipBy;
        c.arriveBy = t.arriveBy;
        c.dispatchBps = t.dispatchBps;
        c.stage = Stage.Open;
        c.supplier = t.supplier;
        c.attestor = t.attestor;
        c.token = t.token;
        c.amount = t.amount;
        c.termsHash = t.termsHash;

        emit Opened(
            id, msg.sender, t.supplier, t.attestor, t.token, t.amount, t.dispatchBps, t.shipBy, t.arriveBy, t.termsHash
        );
        if (!ITIP20(t.token).transferFromWithMemo(msg.sender, address(this), t.amount, id)) revert TransferFailed();
    }

    function _bind(bytes32 id, bytes32 shipmentHash) internal {
        Credit storage c = _credits[id];
        if (c.stage != Stage.Open) revert WrongStage();
        if (c.shipmentHash != 0) revert ShipmentAlreadyBound();
        if (shipmentHash == 0) revert NoShipment();
        c.shipmentHash = shipmentHash;
        emit ShipmentBound(id, shipmentHash);
    }

    function _checkAttestation(Credit storage c, Stage expected, uint40 eventTime, uint40 deadline, bytes32 evidence)
        internal
        view
    {
        if (msg.sender != c.attestor) revert NotAttestor();
        if (c.stage != expected) revert WrongStage();
        if (c.shipmentHash == 0) revert NoShipment();
        if (evidence == 0) revert NoEvidence();
        if (eventTime > deadline) revert EventTooLate();
        if (eventTime > block.timestamp) revert EventInFuture();
    }

    function _close(Credit storage c) internal returns (uint128 remaining) {
        if (c.stage != Stage.Open && c.stage != Stage.Dispatched) revert WrongStage();
        remaining = c.amount - c.settled;
        c.settled = c.amount;
        c.stage = Stage.Closed;
    }

    function _send(address token, address to, uint128 amount, bytes32 id) internal {
        if (amount > 0) ITIP20(token).transferWithMemo(to, amount, id);
    }
}
