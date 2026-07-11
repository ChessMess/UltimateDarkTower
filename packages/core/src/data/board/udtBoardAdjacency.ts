/**
 * Undirected movement-adjacency graph for the 60 board locations, with derived
 * BFS helpers. The graph reflects physical movement adjacency only — kingdoms
 * separated by rivers may be disconnected (`stepDistance` = Infinity); bridges,
 * flight, and teleport are *rules* a host layers on, not graph edges. These are
 * utilities: the board itself enforces no movement rules.
 *
 * GENERATED from tools/location-marker/udtBoardData.json by gen-board-data.mjs.
 * Do not hand-edit — re-author in the location-marker tool and regenerate.
 */

export type BoardAdjacency = Readonly<Record<string /* LocationName */, readonly string[]>>;

/** Undirected, symmetric adjacency for all 60 board locations. */
export const BOARD_ADJACENCY: BoardAdjacency = {
    'Howling Desert': [
        "Azkol's Bane",
        'Idran Forest',
        'Irontops',
        'Lonelight Hills',
        'Mountains of the Watchers',
        'The Cloister',
        'The Emerald Expanse',
    ],
    'Mountains of the Watchers': [
        'Howling Desert',
        'Idran Forest',
        'Lost Lands',
        'Plains of Woldra',
        'The Emerald Expanse',
    ],
    'The Emerald Expanse': [
        "Azkol's Bane",
        'Bone Hills',
        'Howling Desert',
        'Lost Lands',
        'Mountains of the Watchers',
    ],
    "Azkol's Bane": [
        'Archmont',
        'Bone Hills',
        'Howling Desert',
        'The Cloister',
        'The Emerald Expanse',
    ],
    'The Cloister': [
        'Archmont',
        "Azkol's Bane",
        'Howling Desert',
        'Irontops',
        'Sands of Madness',
        'The Throne',
    ],
    Irontops: ['Howling Desert', 'Lonelight Hills', 'The Cloister', 'The Grass Sea', 'The Throne'],
    'Idran Forest': [
        'Anza',
        'Howling Desert',
        'Lonelight Hills',
        'Mountains of the Watchers',
        'Plains of Woldra',
        'Weeping Waters',
    ],
    'Lonelight Hills': [
        'Hissing Groves',
        'Howling Desert',
        'Idran Forest',
        'Irontops',
        'The Grass Sea',
        'Weeping Waters',
    ],
    'The Grass Sea': [
        'Ash Hills',
        'Hissing Groves',
        'Irontops',
        'Lonelight Hills',
        'Tower Scar Desert',
    ],
    'The Throne': [
        'Big Sister',
        'Forest of Shades',
        'Irontops',
        'Sands of Madness',
        'The Cloister',
    ],
    'Sands of Madness': [
        'Archmont',
        'Big Sister',
        'Little Sister',
        'Middle Sister',
        'The Cloister',
        'The Throne',
    ],
    Archmont: [
        "Azkol's Bane",
        'Bone Hills',
        'Little Sister',
        'Sands of Madness',
        'Southern Wastes',
        'The Cloister',
    ],
    'Bone Hills': ['Archmont', "Azkol's Bane", 'Southern Wastes', 'The Emerald Expanse'],
    'Little Sister': [
        'Archmont',
        'Middle Sister',
        'Sands of Madness',
        'Southern Wastes',
        "Ulamel's Hollow",
    ],
    'Forest of Shades': [
        'Big Sister',
        'Bleak Wastes',
        'Dragontooth Lake',
        'Greater Tombstones',
        'The Throne',
    ],
    'Big Sister': [
        'Forest of Shades',
        'Greater Tombstones',
        'Lesser Tombstones',
        'Middle Sister',
        'Sands of Madness',
        'The Throne',
    ],
    'Middle Sister': [
        'Big Sister',
        'Lesser Tombstones',
        'Little Sister',
        'Pine Barrens',
        'Sands of Madness',
        'Three Rivers',
        "Ulamel's Hollow",
    ],
    'Southern Wastes': ['Archmont', 'Bone Hills', 'Little Sister', "Ulamel's Hollow"],
    "Ulamel's Hollow": ['Little Sister', 'Middle Sister', 'Pine Barrens', 'Southern Wastes'],
    'Pine Barrens': ['Middle Sister', 'Three Rivers', "Ulamel's Hollow"],
    'Plains of Woldra': ['Anza', 'Idran Forest', 'Lost Lands', 'Mountains of the Watchers'],
    'Lost Lands': ['Mountains of the Watchers', 'Plains of Woldra', 'The Emerald Expanse'],
    'Weeping Waters': [
        'Anza',
        'Hissing Groves',
        'Idran Forest',
        'Lonelight Hills',
        'The Empty Glade',
        'Yellowpike',
    ],
    Anza: ['Idran Forest', 'Plains of Woldra', 'Weeping Waters', 'Yellowpike'],
    'Hissing Groves': [
        'Ash Hills',
        'Cloudhold',
        'Lonelight Hills',
        'The Empty Glade',
        'The Grass Sea',
        'Weeping Waters',
    ],
    'Ash Hills': [
        'Broken Lands',
        'Cloudhold',
        'Hissing Groves',
        'Muted Forest',
        'The Grass Sea',
        'Tower Scar Desert',
    ],
    'The Empty Glade': [
        'Arkartus',
        'Cloudhold',
        'Delmsmire',
        'Hissing Groves',
        'Weeping Waters',
        'Yellowpike',
    ],
    Yellowpike: ['Anza', 'Arkartus', 'The Empty Glade', 'Weeping Waters'],
    Arkartus: ['Delmsmire', 'The Empty Glade', 'Yellowpike'],
    Delmsmire: ['Arkartus', 'Cloudhold', 'Plains of Plovo', 'The Empty Glade'],
    Cloudhold: [
        'Ash Hills',
        'Broken Lands',
        'Delmsmire',
        'Hissing Groves',
        'Plains of Plovo',
        'The Empty Glade',
    ],
    'Plains of Plovo': ['Broken Lands', 'Cloudhold', 'Delmsmire', 'Lodestone Mountains'],
    'Lodestone Mountains': [
        'Broken Lands',
        'Pearl of the North',
        'Plains of Plovo',
        'Radiant Mountains',
    ],
    'Broken Lands': [
        'Ash Hills',
        'Cloudhold',
        'Lodestone Mountains',
        'Muted Forest',
        'Plains of Plovo',
        'Radiant Mountains',
    ],
    'Muted Forest': [
        'Ash Hills',
        'Broken Lands',
        'Green Bridge',
        'Radiant Mountains',
        'Tower Scar Desert',
        'Upper Ice Fangs',
    ],
    'Tower Scar Desert': [
        'Ash Hills',
        'Bleak Wastes',
        'Muted Forest',
        'The Grass Sea',
        'Upper Ice Fangs',
    ],
    'Radiant Mountains': [
        'Broken Lands',
        'Fivepint',
        'Green Bridge',
        'Lodestone Mountains',
        'Muted Forest',
        'Pearl of the North',
    ],
    'Pearl of the North': ['Fivepint', 'Lodestone Mountains', 'Radiant Mountains'],
    'Green Bridge': [
        'Dayside',
        'Fivepint',
        'Lower Ice Fangs',
        'Muted Forest',
        'Radiant Mountains',
        'Upper Ice Fangs',
    ],
    Fivepint: ['Dayside', 'Green Bridge', 'Pearl of the North', 'Radiant Mountains'],
    Dayside: ['Fivepint', 'Green Bridge', 'Lower Ice Fangs', 'The Tundra'],
    'Upper Ice Fangs': [
        'Bleak Wastes',
        'Green Bridge',
        'Lower Ice Fangs',
        'Muted Forest',
        'Peaks of the Djinn',
        'Tower Scar Desert',
    ],
    'Bleak Wastes': [
        'Dragontooth Lake',
        'Forest of Shades',
        'Peaks of the Djinn',
        'Tower Scar Desert',
        'Upper Ice Fangs',
    ],
    'Lower Ice Fangs': [
        'Dayside',
        'Green Bridge',
        'Peaks of the Djinn',
        'Rimeweald',
        'The Tundra',
        'Upper Ice Fangs',
    ],
    'Peaks of the Djinn': [
        'Bleak Wastes',
        'Dragontooth Lake',
        'Inner Kinghills',
        'Lower Ice Fangs',
        'Rimeweald',
        'Upper Ice Fangs',
    ],
    Rimeweald: [
        "Egan's End",
        'Inner Kinghills',
        'Lower Ice Fangs',
        'Outer Kinghills',
        'Peaks of the Djinn',
        'The Tundra',
    ],
    "Egan's End": ['Outer Kinghills', 'Rimeweald', 'The Tundra'],
    'The Tundra': ['Dayside', "Egan's End", 'Lower Ice Fangs', 'Rimeweald'],
    'Outer Kinghills': ['Copper Grove', "Egan's End", 'Inner Kinghills', 'Rimeweald'],
    'Inner Kinghills': [
        'Copper Grove',
        'Dragontooth Lake',
        'Outer Kinghills',
        'Peaks of the Djinn',
        'Rimeweald',
        'The Decaying Wilds',
    ],
    'Copper Grove': ['Inner Kinghills', 'Jewel Hills', 'Outer Kinghills', 'The Decaying Wilds'],
    'The Decaying Wilds': [
        'Copper Grove',
        'Dragontooth Lake',
        'Greater Tombstones',
        'Inner Kinghills',
        'Jewel Hills',
        "Utar's Barrows",
    ],
    'Dragontooth Lake': [
        'Bleak Wastes',
        'Forest of Shades',
        'Greater Tombstones',
        'Inner Kinghills',
        'Peaks of the Djinn',
        'The Decaying Wilds',
    ],
    'Greater Tombstones': [
        'Big Sister',
        'Dragontooth Lake',
        'Forest of Shades',
        'Lesser Tombstones',
        'The Decaying Wilds',
        "Utar's Barrows",
    ],
    'Jewel Hills': ['Copper Grove', 'Duwani', 'The Decaying Wilds', "Utar's Barrows"],
    "Utar's Barrows": [
        'Duwani',
        'Greater Tombstones',
        'Jewel Hills',
        'Lake of Songs',
        'Lesser Tombstones',
        'The Decaying Wilds',
    ],
    Duwani: ['Jewel Hills', 'Lake of Songs', "Utar's Barrows"],
    'Lesser Tombstones': [
        'Big Sister',
        'Greater Tombstones',
        'Lake of Songs',
        'Middle Sister',
        'Three Rivers',
        "Utar's Barrows",
    ],
    'Lake of Songs': ['Duwani', 'Lesser Tombstones', 'Three Rivers', "Utar's Barrows"],
    'Three Rivers': ['Lake of Songs', 'Lesser Tombstones', 'Middle Sister', 'Pine Barrens'],
};

/** The locations directly adjacent to `loc` (empty if `loc` is unknown). */
export function neighborsOf(loc: string): readonly string[] {
    return BOARD_ADJACENCY[loc] ?? [];
}

/**
 * Breadth-first step distance between two locations. 0 to itself; `Infinity` if
 * they are disconnected or either name is unknown.
 */
export function stepDistance(a: string, b: string): number {
    if (a === b) return 0;
    const visited = new Set<string>([a]);
    let frontier: string[] = [a];
    let dist = 0;
    while (frontier.length > 0) {
        dist++;
        const next: string[] = [];
        for (const node of frontier) {
            for (const n of neighborsOf(node)) {
                if (n === b) return dist;
                if (!visited.has(n)) {
                    visited.add(n);
                    next.push(n);
                }
            }
        }
        frontier = next;
    }
    return Infinity;
}

/**
 * Breadth-first shortest path between two locations, inclusive of both endpoints.
 * `[a]` to itself; `[]` if they are disconnected or either name is unknown.
 */
export function shortestPath(a: string, b: string): readonly string[] {
    if (a === b) return [a];
    const prev = new Map<string, string>();
    const visited = new Set<string>([a]);
    let frontier: string[] = [a];
    while (frontier.length > 0) {
        const next: string[] = [];
        for (const node of frontier) {
            for (const n of neighborsOf(node)) {
                if (visited.has(n)) continue;
                visited.add(n);
                prev.set(n, node);
                if (n === b) {
                    const path: string[] = [b];
                    let cur: string | undefined = b;
                    while (cur !== undefined && cur !== a) {
                        cur = prev.get(cur);
                        if (cur !== undefined) path.push(cur);
                    }
                    return path.reverse();
                }
                next.push(n);
            }
        }
        frontier = next;
    }
    return [];
}
