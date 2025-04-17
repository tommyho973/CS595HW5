// CircuitTomlGenerator.ts

import { MerkleTree } from './MerkleTree';
import { Fr, BarretenbergSync } from '@aztec/bb.js';

/**
 * Interface to represent a deposit record.
 */
interface DepositRecord {
  id: Fr;
  r: Fr;
  commitment: Fr;
  index: Fr;       // Now stored as an Fr element.
  oldRoot: Fr;
  newRoot: Fr;
  hashPath: Fr[];      // Merkle proof's sibling path.
  pathIndices: number[]; // Indicates which side each sibling is on.
}

/**
 * NoirCircuitTomlGenerator
 *
 * This class maintains the state of a Merkle tree (depth 8) and
 * generates TOML configuration strings for two Noir circuits.
 *
 * Methods:
 * - deposit(id, r): Computes a commitment using a Pedersen hash over [id, r],
 *   updates the Merkle tree, and records the deposit details (with the index as an Fr).
 * - gentoml(...): Generates a TOML string according to the circuit requirements.
 *    - For "deposit": returns a TOML string with id, r, hashpath, oldRoot, newRoot, commitment, and index.
 *    - For "withdraw": returns a TOML string with r, index, hashpath, root (newRoot), and id.
 */
export class NoirCircuitTomlGenerator {
  private tree: MerkleTree;
  private deposits: DepositRecord[];

  /**
   * Initializes an instance with an empty Merkle tree of depth 8.
   */
  constructor() {
    this.tree = new MerkleTree(8);
    this.deposits = [];
  }

  /**
   * Initializes the Merkle tree (sets up BarretenbergSync and builds zero values).
   */
  async init() {
    await this.tree.initialize([]);
  }

  /**
   * Helper to convert a number to a properly formatted Fr element.
   * Converts number to hex, pads to 64 characters (32 bytes), prefixes with "0x".
   *
   * @param num - The numeric index.
   * @returns The Fr element.
   */
  private numToFr(num: number): Fr {
    const paddedIndex = '0x' + num.toString(16).padStart(64, '0');
    return Fr.fromString(paddedIndex);
  }

  /**
   * Performs a deposit into the Merkle tree.
   *
   * Process:
   *  - Computes the Pedersen hash commitment over [id, r].
   *  - Gets the current tree root and Merkle proof for the next free leaf.
   *  - Converts the numeric deposit index to an Fr element.
   *  - Inserts the commitment into the tree.
   *  - Saves a deposit record.
   *
   * @param id - Field element for the deposit identifier.
   * @param r - Field element used in the deposit.
   */
  deposit(id: Fr, r: Fr): void {
    const indexNumber = this.tree.totalLeaves;
    const indexFr = this.numToFr(indexNumber);
    const oldRoot = this.tree.root();
    const proof = this.tree.proof(indexNumber);
    const hashPath = proof.pathElements;

    // Calculate the Pedersen hash commitment.
    const commitment = this.tree.bb.pedersenHash([id, r], 0);

    // Update the tree with the new commitment.
    this.tree.insert(commitment);
    const newRoot = this.tree.root();

    // Record the deposit details.
    const record: DepositRecord = {
      id,
      r,
      commitment,
      index: indexFr,
      oldRoot,
      newRoot,
      hashPath,
      pathIndices: proof.pathIndices,
    };
    this.deposits.push(record);
  }

  /**
   * Generates a TOML configuration string for the Noir circuits.
   *
   * For "deposit": performs the deposit process and generates a TOML string for the deposit circuit,
   * which includes id, r, hashpath, oldRoot, newRoot, commitment, and index (as Fr).
   *
   * For "withdraw": given a numeric index, retrieves the deposit record and generates a TOML
   * string for the withdraw circuit containing r, index (as Fr), hashpath, root, and id.
   *
   * @param circuitType - Either "deposit" or "withdraw".
   * @param param1 - For "deposit": the Field element id; for "withdraw": the deposit index (number).
   * @param param2 - For "deposit": the Field element r; not used for "withdraw".
   * @returns A string formatted in TOML.
   */
  gentoml(circuitType: 'deposit', id: Fr, r: Fr): string;
  gentoml(circuitType: 'withdraw', index: number): string;
  gentoml(circuitType: 'deposit' | 'withdraw', param1: any, param2?: any): string {
    if (circuitType === 'deposit') {
      const id: Fr = param1;
      const r: Fr = param2;
      const indexNumber = this.tree.totalLeaves;
      const indexFr = this.numToFr(indexNumber);
      const oldRoot = this.tree.root();
      const proof = this.tree.proof(indexNumber);
      const hashPath = proof.pathElements;

      // Compute the commitment.
      const commitment = this.tree.bb.pedersenHash([id, r], 0);

      // Insert the commitment into the tree.
      this.tree.insert(commitment);
      const newRoot = this.tree.root();

      // Save the deposit record.
      const record: DepositRecord = {
        id,
        r,
        commitment,
        index: indexFr,
        oldRoot,
        newRoot,
        hashPath,
        pathIndices: proof.pathIndices,
      };
      this.deposits.push(record);

      // Generate and return the TOML string for the deposit circuit.
      return `
id = "${id.toString()}"
r = "${r.toString()}"
oldPath = [${hashPath.map((fr: Fr) => `"${fr.toString()}"`).join(', ')}]
oldRoot = "${oldRoot.toString()}"
newRoot = "${newRoot.toString()}"
commitment = "${commitment.toString()}"
index = "${indexFr.toString()}"
      `.trim();
    } else if (circuitType === 'withdraw') {
      const indexNumber: number = param1;
      const indexFr = this.numToFr(indexNumber);

      // Find the deposit record matching the provided index.
      const record = this.deposits.find(
        rec => rec.index.toString() === indexFr.toString(),
      );
      if (!record) {
        throw new Error(`No deposit record found for index ${indexNumber}`);
      }

      // Generate and return the TOML string for the withdraw circuit.
      return `
r = "${record.r.toString()}"
index = "${record.index.toString()}"
path = [${record.hashPath.map((fr: Fr) => `"${fr.toString()}"`).join(', ')}]
root = "${record.newRoot.toString()}"
id = "${record.id.toString()}"
      `.trim();
    }
    throw new Error('Invalid circuit type');
  }
}

