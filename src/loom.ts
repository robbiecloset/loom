// Max globals

// @ts-ignore
outlets = 2;

// "Globals"

// Numeric representation of the current octive upon which
// note calculations are applied.
let currentOctave: number = 4;

// The numeric represetation of the root note of a given scale.
// Defaults to "0", (C)
let currentRoot: number = 0;

// Will track the current selected scale.
let currentScale: Scale;

// This varies across implimentations so calling it out for now,
// even though I'm not using it yet.
let middleC: number = 60;

// A collection of all scales available to the user.
let scales: Array<Scale>;

// A state of the 'board'
let state: State;

// Zero indexed upper limit on the x value,
// which is the number of columns, or "notes"
let x: number = 15;

// Zero indexed upper limit on the y value,
// which is the number of rows, or "triggers"
let y: number = 7;

enum Lights  {
  on = 8,
  off = 0,
  playing = 12
};

// Global helpers

// Is a cell on?
let active = (n: number):boolean => {
    return n >= Lights.on;
}

let getMidiNote = (n: number): number => {
    let noteNumber: number = currentScale.note(n);
    let baseNoteNumber: number = (((currentOctave + 1) * 12) + currentRoot);
    return baseNoteNumber + noteNumber;
}

// // //  // // // //
// Max interface
// // // // // // //

function loadbang():void {
    // @ts-ignore
    post("Hello, from js.");
    init();
};

function init():void {
    scales = [];
    scales.push(new Scale(
        "Major",
        [0, 2, 4, 5, 7, 9, 11, 12]
    ));
    currentScale = Scale.findByName("Major");

    state = new State(x + 1, y + 1);
    drawMaxtrixCtrl();
}

let drawMaxtrixCtrl = ():void => {
    // @ts-ignore
    outlet.apply(this, ...[[0].concat(state.toMatrixCtrl())])
}

// // // // //
// Handlers; triggered via max messages sent to js object
//
function handleAddRandomNote():void {
    let note: Note = randomNote();
    state.addNote(note);
}

function handleAddRandomTrigger():void {
    let trigger: Trigger = randomTrigger();
    state.addTrigger(trigger);
}

function handleClear():void {
    state = new State(x + 1, y + 1);
    drawMaxtrixCtrl();
}

function addNote(x?: number, y?: number, length?: number, direction?: number):void {
    let coords: [number, number];
    if (x && y) {
        coords = [x, y];
    } else {
        coords = randomCoords();
    };
    let note = new Note({ coords, length: length || randomNumber(x), direction: direction || 1, max: y });

    state.addNote(note);
}

function addTrigger(x?: number, y?: number, length?: number, direction?: number):void {
    let coords: [number, number];
    if (x && y) {
        coords = [x, y];
    } else {
        coords = randomCoords();
    };
    let trigger = new Trigger({ coords, length: length || randomNumber(y), direction: direction || 1, max: x });

    state.addTrigger(trigger);
}

function tick():void {
    state.tick();
}

function randomNumber(max: number): number {
    return Math.floor(Math.random() * Math.floor(max))
}

function randomCoords(): [number, number] {
    let randX: number = randomNumber(x);
    let randY: number = randomNumber(y);
    return [randX, randY];
}

function randomNote(): Note {
    let coords: [number, number] = randomCoords();
    let l: number = randomNumber(y);

    return new Note({ coords, length: l, direction: 1, max: y });
}

function randomTrigger(): Trigger {
    let coords: [number, number] = randomCoords();
    let l: number = randomNumber(x);

    return new Trigger({ coords, length: l, direction: 1, max: x });
}

class State {
    // Max number of _columns_ counting horizontally across the grid.
    public x: number;
    // Max number of _rows_ counting vertically up / down the grid.
    public y: number;
    public state: Array<Array<number>>;
    private playing: Array<boolean>;
    public notes: Note[] = Array<Note>(this.x);
    public triggers: Trigger[] = Array<Trigger>(this.y);

    public constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.state = this.initState();
        this.playing = Array.apply(null, Array(this.x)).map(function() {
            return false;
        });
    };

    public toMatrixCtrl(): Array<Array<number>> {
        let map: Array<Array<number>> = [];

        this.state.forEach(function(column, x) {
            column.forEach(function(cell, y) {
                map.push([ x, y, cell ]);
            });
        });

        return map;
    }

    public tick():void {
        for (let note of this.notes) {
            if (note == undefined) {
                continue;
            }
            note.tick();
            this.drawNote(note);
        }

        for (let trigger of this.triggers) {
            if (trigger == undefined) {
                continue;
            }
            trigger.tick();
            this.drawTrigger(trigger);
        }

        this.play();
    }

    private play():void {
        let note: Note;
        let previousPlayingState: boolean;
        for (let x = 0; x < this.x; x++) {
            note = this.notes[x];
            if (note == undefined) {
                continue;
            }
            previousPlayingState = note.playing;
            note.playing = false;

            for (let y = 0; y < this.y; y++) {
                if (
                    // Current x,y is active.
                    (active(this.state[x][y])) &&
                    // We are either at x left edge or
                    // x - 1 is also active.
                    (x == 0 || active(this.state[x - 1][y])) &&
                    // We are either at x right edge or
                    // x + 1 is also active.
                    (x == (this.x - 1) || active(this.state[x + 1][y])) &&
                    // We are either at y top edge or
                    // y - 1 is also active.
                    (y == 0 || active(this.state[x][y - 1])) &&
                    // We are either at y bottom edge or
                    // y + 1 is also active.
                    (y == (this.y - 1) || active(this.state[x][y + 1]))
                ) {
                    note.playing = true;
                    let midiNote: number = getMidiNote(x);
                    // @ts-ignore
                    outlet(1, [midiNote, 127]);
                }
            }

            // If the note isn't playing anymore, turn it off.
            if (previousPlayingState && !note.playing) {
                let midiNote: number = getMidiNote(x);
                // @ts-ignore
                outlet(1, [midiNote, 0]);
            }
        }
    }

    public addNote(note: Note):void {
        this.notes[note.coords[0]] = note;
        this.drawNote(note);
    }

    public drawNote(note: Note):void {
        // Turn the lights on for each note cell.
        for (let i = 0; i < note.length; i++) {
            this.state[note.coords[0]][(note.coords[1] + i) % (y + 1)] = Lights.on;
        }

        // If the note length is equal to the y length of the board,
        // we do not have to worry about turning off cells that are no
        // longer "on".
        //
        // TODO: It seems like the norns version of loom pads lengths
        // some so that there is not a note / trigger that is always on.
        if (note.length == y) {
            return;
        }

        // If a cell should no longer be on, turn it off.
        //
        // Moving in the positive direction (so a note will be moving
        // the down*), we look one cell up:
        //
        // [x][y - 1]
        //
        // If the value is not greater than 0, we ignore.
        //
        // *=this is specific to the matrix control in Max and may not
        // always be the case!
        //
        if (note.direction == 1) {
            // If the value is less than zero, we assume that there is
            // a cell on the other side of the board that needs to be
            // turned off.
            if (note.coords[1] - 1 < 0) {
                this.state[note.coords[0]][note.max] = Lights.off;
            } else {
                this.state[note.coords[0]][note.coords[1] - 1] = Lights.off;
            }
        // Moving in the negative direction (so a note will be moving
        // up), we look one cell down:
        //
        // [x][y + 1]
        //
        } else if (note.direction == -1) {
            // If the value is greater than note.max (ie, off the end of the bottom
            // of the board), we assume there is a cell on the other side of the board
            // that needs to be turned off.
            if ((note.coords[1] + 1) > note.max) {
                this.state[note.coords[0]][0] = Lights.off;
            } else {
                this.state[note.coords[0]][note.coords[1] + 1] = Lights.off;
            }
        }
        drawMaxtrixCtrl();
    }

    public addTrigger(trigger: Trigger):void {
        this.triggers[trigger.coords[1]] = trigger;
        this.drawTrigger(trigger);
    }

    public drawTrigger(trigger: Trigger):void {
        // Turn the lights on for each trigger cell.
        for (let i = 0; i < trigger.length; i++) {
            this.state[(trigger.coords[0] + i) % (x + 1)][trigger.coords[1]] = Lights.on;
        }

        // If the trigger length is equal to the x length of the board,
        // we do not have to worry about turning off cells that are no
        // longer "on".
        if (trigger.length == x) {
            return;
        }

        // If a cell should no longer be on, turn it off.
        //
        // Moving in the positive direction (so a trigger will be moving
        // to the right), we look one cell to the left:
        //
        // [x - 1][y]
        //
        if (trigger.direction == 1) {
            // If the value is less than 0, we assume there is a cell on
            // the other side of the board that needs to be turned off.
            if (trigger.coords[0] - 1 < 0) {
                this.state[trigger.max][trigger.coords[1]] = Lights.off;
            } else {
                this.state[trigger.coords[0] - 1][trigger.coords[1]] = Lights.off;
            }

        // Moving in the negative direction (so a trigger will be moving
        // to the left), we look one cell to the right
        //
        // [x + 1][y]
        //
        } else if (trigger.direction == -1 && (trigger.coords[0] + 1) > x) {
            // If the value is greater than trigger.max (ie, off the end of the right side
            // of the board), we assume there is a cell on the right side of the board
            // that needs to be turned off.
            if ((trigger.coords[0] + 1) > trigger.max) {
                this.state[trigger.max][trigger.coords[1]] = Lights.off;
            } else {
                this.state[trigger.coords[0] + 1][trigger.coords[1]] = Lights.off;
            }
        }
        drawMaxtrixCtrl();
    }

    private initState(): Array<Array<number>> {
        return Array.apply(null, Array(this.x)).map(function() {
            return this.initY();
        }.bind(this));
    }

    private initY(): Array<number> {
        return Array.apply(null, Array(this.y)).map(function() {
            return Lights.off;
        });
    };
};

class Note {
    public coords: [number,number];
    public length: number;
    // This should be a `1` or `-1` to indicate direction.
    public direction: number;
    public max: number = y;
    public playing: boolean = false;

    public constructor({ coords, length, direction = 1, max }: { coords: [number, number]; length: number; direction: number; max: number; }) {
        this.coords = coords;
        this.length = length;
        this.direction = direction;
        this.max = max;
    }

    public tick(): [number,number] {
        // coords[0], ie, the x value, stays the same.
        // coords[1], ie, the y value, moves in the direction
        // indicated by direction.
        let newY: number = this.coords[1] + this.direction;
        if (newY > this.max) {
            newY = 0;
        } else if (newY < 0) {
            newY = this.max;
        }
        return this.coords = [this.coords[0], newY]
    }
}

class Trigger {
    public coords: [number,number];
    public length: number;
    // This should be a `1` or `-1` to indicate direction.
    public direction: number;
    public max: number = x;

    public constructor({ coords, length, direction = 1, max }: { coords: [number, number]; length: number; direction: number; max: number; }) {
        this.coords = coords;
        this.length = length;
        this.direction = direction;
        this.max = max;
    }

    public tick(): [number,number] {
        // coords[0], ie, the x value, moves in the direction
        // indicated by direction.
        // coords[1], ie, the y value, stays the same.
        let newX: number = this.coords[0] + this.direction;
        if (newX > this.max) {
            newX = 0;
        } else if (newX < 0) {
            newX = this.max;
        }
        return this.coords = [newX, this.coords[1]]
    }
}

class Scale {
    public name: string;
    public intervals: Array<number>;

    static findByName(name:string):Scale {
        // For now I'm targeting ES3(!!!), so no `Array.prototype.find`.
        let found:Scale;
        for (let scale of scales) {
            if (scale.name == name) {
                found = scale;
                break;
            }
        }
        return found;
    }

    public constructor(name: string, intervals: Array<number>) {
        this.name = name;
        this.intervals = intervals;
    };

    public note(n: number): number {
        let octave: number = Math.floor(n / this.intervals.length);
        let noteInScale: number = this.intervals[n - (octave * this.intervals.length)];
        return (octave * 12) + noteInScale;
    }
}