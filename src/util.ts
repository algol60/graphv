// Various helper utilities.
//

/**
 * Helper function to allow push() to a Float32Array.
 */
export class F32Array {
    private ix: number;
    private a: Float32Array;

    constructor(n: number) {
        this.ix = 0;
        this.a = new Float32Array(n);
    }

    push(...args: number[]): void {
        for (const arg of args) {
            this.a[this.ix++] = arg;
        }
    }

    get array(): Float32Array {
        if (this.ix!==this.a.length) {
            throw new RangeError(`array length: ${this.a.length}; values pushed: ${this.ix}`);
        }

        return this.a;
    }
}

export class NodeIndex {
    x: number;
    y: number;
    z: number;
    index: number;

    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.index = -1;
    }
}

/**
 * A helper class to build indexes positions.
 *
 * Using a Map<node-id, NodeIndex>, each node position (of a node that has at least
 * one edge) only needs to be added to the edgePositions array once.
 * The final length of edgePositions depends on the number of nodes that have edges.
 *
 * The edgeIndexes array holds pairs of indexes for each line.
 * The final length of edgeIndexes is number_of_edges * 2.
 */
export class EdgeIndex {
    nodeIndexes: Map<string, NodeIndex>;
    edgePositions: number[];
    edgeIndexes: number[];
    private index: number;

    constructor(nodeIndexes: Map<string, NodeIndex>) {
        this.nodeIndexes = nodeIndexes;
        this.edgePositions = [];
        this.edgeIndexes = [];
        this.index = 0;
    }

    add(src: string, tgt: string) {
        const si = this.nodeIndexes.get(src)!;
        if (si.index===-1) {
            this.edgePositions.push(si.x, si.y, si.z);
            si.index = this.index++;
        }
        this.edgeIndexes.push(si.index);

        const ti = this.nodeIndexes.get(tgt)!;
        if (ti.index===-1) {
            this.edgePositions.push(ti.x, ti.y, ti.z);
            ti.index = this.index++;
        }
        this.edgeIndexes.push(ti.index);
    }
}