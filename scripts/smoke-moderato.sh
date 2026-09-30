#!/usr/bin/env bash
# End-to-end credit on Tempo Moderato against the real TIP-20 precompile. Needs contracts/.env and PRIMAGE_ADDRESS.
set -euo pipefail
cd "$(dirname "$0")/../contracts"
set -a; . ./.env; set +a

RPC=https://rpc.moderato.tempo.xyz
LC=${PRIMAGE_ADDRESS:?set PRIMAGE_ADDRESS}
TOK=0x20c0000000000000000000000000000000000001 # AlphaUSD
FEE=(--tempo.fee-token 0x20c0000000000000000000000000000000000000)
MEMO_TOPIC=$(cast keccak "TransferWithMemo(address,address,uint256,bytes32)")

send() { cast send "$@" --rpc-url $RPC "${FEE[@]}" --json; }
status() { node -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(process.argv[1],r.status==="0x1"||r.status==="success"?"ok":"FAILED "+r.status,r.transactionHash);' "$1"; }
bal() { cast call $TOK 'balanceOf(address)(uint256)' "$1" --rpc-url $RPC | cut -d' ' -f1; }

NOW=$(cast block latest -f timestamp --rpc-url $RPC)
SALT=$(cast keccak "smoke-$NOW")
TERMS=$(cast keccak "PRIMAGE/1 smoke terms $NOW")
ID=$(cast keccak "$(cast abi-encode 'f(address,bytes32)' "$DEPLOYER_ADDRESS" "$SALT")")
SUP_BEFORE=$(bal "$SUPPLIER_ADDRESS")
echo "credit $ID"

send $TOK "approve(address,uint256)" $LC 100000000 --private-key "$DEPLOYER_KEY" | status approve
send $LC "open(bytes32,(address,address,address,uint128,uint16,uint40,uint40,bytes32))" "$SALT" \
  "($SUPPLIER_ADDRESS,$ATTESTOR_ADDRESS,$TOK,100000000,8000,$((NOW + 86400)),$((NOW + 172800)),$TERMS)" \
  --private-key "$DEPLOYER_KEY" | status open
echo "escrow holds $(bal $LC)"

send $LC "bindContainer(bytes32,bytes32)" "$ID" "$(cast keccak 'salt:KOCU4221161')" --private-key "$SUPPLIER_KEY" | status bindContainer

OUT=$(send $LC "attestLoaded(bytes32,uint40,bytes32)" "$ID" $((NOW - 60)) "$(cast keccak evidence-$NOW)" --private-key "$ATTESTOR_KEY")
echo "$OUT" | status attestLoaded
echo "$OUT" | node -e '
const r=JSON.parse(require("fs").readFileSync(0,"utf8"));
for (const l of r.logs) if (l.topics[0]===process.argv[1]) console.log("  TransferWithMemo to 0x"+l.topics[2].slice(26),"memo",l.topics[3]);' "$MEMO_TOPIC"

SUP_AFTER=$(bal "$SUPPLIER_ADDRESS")
echo "supplier received $((SUP_AFTER - SUP_BEFORE)) (expect 80000000), escrow holds $(bal $LC) (expect 20000000)"
