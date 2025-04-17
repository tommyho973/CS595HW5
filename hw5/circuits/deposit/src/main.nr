use std::{hash::{pedersen_hash_with_separator, pedersen_hash}, merkle::compute_merkle_root};

fn main(
    // Private inputs
    id: Field,
    r: Field,
    oldPath: [Field; 8],
    // Public inputs
    oldRoot: pub Field,
    newRoot: pub Field,
    commitment: pub Field,
    index: pub Field
){
    assert(commitment == pedersen_hash_with_separator([id,r], 0));
    let computed_new_root = compute_merkle_root(commitment, index, oldPath);
    assert(computed_new_root == newRoot);
    let oldLeaf = 0x18d85f3de6dcd78b6ffbf5d8374433a5528d8e3bf2100df0b7bb43a4c59ebd63;
    let computed_old_root = compute_merkle_root(oldLeaf, index, oldPath);
    assert(computed_old_root== oldRoot);
} 

#[test]
fn test_main() {
    //main(1, 2);

    // Uncomment to make test fail
    // main(1, 1);
}
