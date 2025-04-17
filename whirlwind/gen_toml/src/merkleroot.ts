import { MerkleTree } from "./MerkleTree";
import { Fr } from '@aztec/bb.js';

async function generateRoot(){
    const tree = new MerkleTree(8);
    await tree.initialize([]);
    const rootBytes32 = "0x" + BigInt(tree.root().toString()).toString(16).padStart(64, "0");
    console.log("Tree Root (bytes32):\n", rootBytes32);
}
generateRoot().catch(console.error);