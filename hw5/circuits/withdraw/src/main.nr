use std::merkle::compute_merkle_root;

fn main(
    r: Field,
    index: Field,
    path: [Field; 8],
    root: pub Field,
    id: pub Field
){
    let commitment = std::hash::pedersen_hash_with_separator([id,r], 0);
    let current = compute_merkle_root(commitment, index, path);
    assert(current == root);
    assert(id != 0);
}
#[test]
fn test_main() {
    //main(1, 2);

    // Uncomment to make test fail
    // main(1, 1);
}
