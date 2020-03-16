// Max globals
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var _this = this;
// @ts-ignore
outlets = 2;
// "Globals"
// Numeric representation of the current octive upon which
// note calculations are applied.
var currentOctave = 4;
// The numeric represetation of the root note of a given scale.
// Defaults to "0", (C)
var currentRoot = 0;
// Will track the current selected scale.
var currentScale;
// This varies across implimentations so calling it out for now,
// even though I'm not using it yet.
var middleC = 60;
// A collection of all scales available to the user.
var scales;
// A state of the 'board'
var state;
// Zero indexed upper limit on the x value,
// which is the number of columns, or "notes"
var x = 15;
// Zero indexed upper limit on the y value,
// which is the number of rows, or "triggers"
var y = 7;
var Lights;
(function (Lights) {
    Lights[Lights["on"] = 8] = "on";
    Lights[Lights["off"] = 0] = "off";
    Lights[Lights["playing"] = 12] = "playing";
})(Lights || (Lights = {}));
;
// Global helpers
// Is a cell on?
var active = function (n) {
    return n >= Lights.on;
};
var getMidiNote = function (n) {
    var noteNumber = currentScale.note(n);
    var baseNoteNumber = (((currentOctave + 1) * 12) + currentRoot);
    return baseNoteNumber + noteNumber;
};
// // //  // // // //
// Max interface
// // // // // // //
function loadbang() {
    // @ts-ignore
    post("Hello, from js.");
    init();
}
;
function init() {
    scales = [];
    scales.push(new Scale("Major", [0, 2, 4, 5, 7, 9, 11, 12]));
    currentScale = Scale.findByName("Major");
    state = new State(x + 1, y + 1);
    drawMaxtrixCtrl();
}
var drawMaxtrixCtrl = function () {
    // @ts-ignore
    outlet.apply.apply(outlet, __spreadArrays([_this], [[0].concat(state.toMatrixCtrl())]));
};
// // // // //
// Handlers; triggered via max messages sent to js object
//
function handleAddRandomNote() {
    var note = randomNote();
    state.addNote(note);
}
function handleAddRandomTrigger() {
    var trigger = randomTrigger();
    state.addTrigger(trigger);
}
function handleClear() {
    state = new State(x + 1, y + 1);
    drawMaxtrixCtrl();
}
function addNote(x, y, length, direction) {
    var coords;
    if (x && y) {
        coords = [x, y];
    }
    else {
        coords = randomCoords();
    }
    ;
    var note = new Note({ coords: coords, length: length || randomNumber(x), direction: direction || 1, max: y });
    state.addNote(note);
}
function addTrigger(x, y, length, direction) {
    var coords;
    if (x && y) {
        coords = [x, y];
    }
    else {
        coords = randomCoords();
    }
    ;
    var trigger = new Trigger({ coords: coords, length: length || randomNumber(y), direction: direction || 1, max: x });
    state.addTrigger(trigger);
}
function tick() {
    state.tick();
}
function randomNumber(max) {
    return Math.floor(Math.random() * Math.floor(max));
}
function randomCoords() {
    var randX = randomNumber(x);
    var randY = randomNumber(y);
    return [randX, randY];
}
function randomNote() {
    var coords = randomCoords();
    var l = randomNumber(y);
    return new Note({ coords: coords, length: l, direction: 1, max: y });
}
function randomTrigger() {
    var coords = randomCoords();
    var l = randomNumber(x);
    return new Trigger({ coords: coords, length: l, direction: 1, max: x });
}
var State = /** @class */ (function () {
    function State(x, y) {
        this.notes = Array(this.x);
        this.triggers = Array(this.y);
        this.x = x;
        this.y = y;
        this.state = this.initState();
        this.playing = Array.apply(null, Array(this.x)).map(function () {
            return false;
        });
    }
    ;
    State.prototype.toMatrixCtrl = function () {
        var map = [];
        this.state.forEach(function (column, x) {
            column.forEach(function (cell, y) {
                map.push([x, y, cell]);
            });
        });
        return map;
    };
    State.prototype.tick = function () {
        for (var _i = 0, _a = this.notes; _i < _a.length; _i++) {
            var note = _a[_i];
            if (note == undefined) {
                continue;
            }
            note.tick();
            this.drawNote(note);
        }
        for (var _b = 0, _c = this.triggers; _b < _c.length; _b++) {
            var trigger = _c[_b];
            if (trigger == undefined) {
                continue;
            }
            trigger.tick();
            this.drawTrigger(trigger);
        }
        this.play();
    };
    State.prototype.play = function () {
        var note;
        var previousPlayingState;
        for (var x_1 = 0; x_1 < this.x; x_1++) {
            note = this.notes[x_1];
            if (note == undefined) {
                continue;
            }
            previousPlayingState = note.playing;
            note.playing = false;
            for (var y_1 = 0; y_1 < this.y; y_1++) {
                if (
                // Current x,y is active.
                (active(this.state[x_1][y_1])) &&
                    // We are either at x left edge or
                    // x - 1 is also active.
                    (x_1 == 0 || active(this.state[x_1 - 1][y_1])) &&
                    // We are either at x right edge or
                    // x + 1 is also active.
                    (x_1 == (this.x - 1) || active(this.state[x_1 + 1][y_1])) &&
                    // We are either at y top edge or
                    // y - 1 is also active.
                    (y_1 == 0 || active(this.state[x_1][y_1 - 1])) &&
                    // We are either at y bottom edge or
                    // y + 1 is also active.
                    (y_1 == (this.y - 1) || active(this.state[x_1][y_1 + 1]))) {
                    note.playing = true;
                    var midiNote = getMidiNote(x_1);
                    // @ts-ignore
                    outlet(1, [midiNote, 127]);
                }
            }
            // If the note isn't playing anymore, turn it off.
            if (previousPlayingState && !note.playing) {
                var midiNote = getMidiNote(x_1);
                // @ts-ignore
                outlet(1, [midiNote, 0]);
            }
        }
    };
    State.prototype.addNote = function (note) {
        this.notes[note.coords[0]] = note;
        this.drawNote(note);
    };
    State.prototype.drawNote = function (note) {
        // Turn the lights on for each note cell.
        for (var i = 0; i < note.length; i++) {
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
            }
            else {
                this.state[note.coords[0]][note.coords[1] - 1] = Lights.off;
            }
            // Moving in the negative direction (so a note will be moving
            // up), we look one cell down:
            //
            // [x][y + 1]
            //
        }
        else if (note.direction == -1) {
            // If the value is greater than note.max (ie, off the end of the bottom
            // of the board), we assume there is a cell on the other side of the board
            // that needs to be turned off.
            if ((note.coords[1] + 1) > note.max) {
                this.state[note.coords[0]][0] = Lights.off;
            }
            else {
                this.state[note.coords[0]][note.coords[1] + 1] = Lights.off;
            }
        }
        drawMaxtrixCtrl();
    };
    State.prototype.addTrigger = function (trigger) {
        this.triggers[trigger.coords[1]] = trigger;
        this.drawTrigger(trigger);
    };
    State.prototype.drawTrigger = function (trigger) {
        // Turn the lights on for each trigger cell.
        for (var i = 0; i < trigger.length; i++) {
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
            }
            else {
                this.state[trigger.coords[0] - 1][trigger.coords[1]] = Lights.off;
            }
            // Moving in the negative direction (so a trigger will be moving
            // to the left), we look one cell to the right
            //
            // [x + 1][y]
            //
        }
        else if (trigger.direction == -1 && (trigger.coords[0] + 1) > x) {
            // If the value is greater than trigger.max (ie, off the end of the right side
            // of the board), we assume there is a cell on the right side of the board
            // that needs to be turned off.
            if ((trigger.coords[0] + 1) > trigger.max) {
                this.state[trigger.max][trigger.coords[1]] = Lights.off;
            }
            else {
                this.state[trigger.coords[0] + 1][trigger.coords[1]] = Lights.off;
            }
        }
        drawMaxtrixCtrl();
    };
    State.prototype.initState = function () {
        return Array.apply(null, Array(this.x)).map(function () {
            return this.initY();
        }.bind(this));
    };
    State.prototype.initY = function () {
        return Array.apply(null, Array(this.y)).map(function () {
            return Lights.off;
        });
    };
    ;
    return State;
}());
;
var Note = /** @class */ (function () {
    function Note(_a) {
        var coords = _a.coords, length = _a.length, _b = _a.direction, direction = _b === void 0 ? 1 : _b, max = _a.max;
        this.max = y;
        this.playing = false;
        this.coords = coords;
        this.length = length;
        this.direction = direction;
        this.max = max;
    }
    Note.prototype.tick = function () {
        // coords[0], ie, the x value, stays the same.
        // coords[1], ie, the y value, moves in the direction
        // indicated by direction.
        var newY = this.coords[1] + this.direction;
        if (newY > this.max) {
            newY = 0;
        }
        else if (newY < 0) {
            newY = this.max;
        }
        return this.coords = [this.coords[0], newY];
    };
    return Note;
}());
var Trigger = /** @class */ (function () {
    function Trigger(_a) {
        var coords = _a.coords, length = _a.length, _b = _a.direction, direction = _b === void 0 ? 1 : _b, max = _a.max;
        this.max = x;
        this.coords = coords;
        this.length = length;
        this.direction = direction;
        this.max = max;
    }
    Trigger.prototype.tick = function () {
        // coords[0], ie, the x value, moves in the direction
        // indicated by direction.
        // coords[1], ie, the y value, stays the same.
        var newX = this.coords[0] + this.direction;
        if (newX > this.max) {
            newX = 0;
        }
        else if (newX < 0) {
            newX = this.max;
        }
        return this.coords = [newX, this.coords[1]];
    };
    return Trigger;
}());
var Scale = /** @class */ (function () {
    function Scale(name, intervals) {
        this.name = name;
        this.intervals = intervals;
    }
    Scale.findByName = function (name) {
        // For now I'm targeting ES3(!!!), so no `Array.prototype.find`.
        var found;
        for (var _i = 0, scales_1 = scales; _i < scales_1.length; _i++) {
            var scale = scales_1[_i];
            if (scale.name == name) {
                found = scale;
                break;
            }
        }
        return found;
    };
    ;
    Scale.prototype.note = function (n) {
        var octave = Math.floor(n / this.intervals.length);
        var noteInScale = this.intervals[n - (octave * this.intervals.length)];
        return (octave * 12) + noteInScale;
    };
    return Scale;
}());
