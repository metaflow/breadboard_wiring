import { componentDeserializers, ComponentSpec } from "./component";
import Konva from "konva";
import { scale, pointAsNumber, PhysicalPoint } from "../stage";
import { Contact } from "./contact";
import { appActions } from "../action";
import { MoveSelectionAction } from "../actions/move_selection";
import { SelectableComponent } from "./selectable_component";
import { SelectAction } from "../actions/select_action";

const marker = 'IntegratedCircuitSchematic';

componentDeserializers.push(function (data: any): (IntegratedCircuitSchematic | null) {
    if (data['type_marker'] !== marker) {
        return null
    }
    return new IntegratedCircuitSchematic(data['spec'] as IntegratedCircuitSchematicSpec);
});

const gap = 1;
const width = 20;
const contact_height = 5;
const contact_label_width = 5;
const pin_length = 5;
const label_font_size = 3;

export interface IntegratedCircuitSchematicSpec {
    type_marker? : string;
    left_pins: string[];
    right_pins: string[];
    label: string;
    super?: ComponentSpec;
}

export class IntegratedCircuitSchematic extends SelectableComponent {
    rect: Konva.Rect;
    name: Konva.Text;
    left_pins: string[] = [];
    left_labels: Konva.Text[] = [];
    right_pins: string[] = [];
    right_labels: Konva.Text[] = [];
    contacts: Contact[] = [];
    pin_lines: Konva.Line[] = [];

    constructor(spec: IntegratedCircuitSchematicSpec) {
        super(spec.super);
        this.left_pins = spec.left_pins;
        this.right_pins = spec.right_pins;
        this.rect = new Konva.Rect({
            stroke: 'black',
            strokeWidth: 1,
            name: 'selectable',
        });
        this.shapes.add(this.rect);
        for (let i = 0; i < this.left_pins.length; i++) {
            const s = this.left_pins[i];
            const t = new Konva.Text({ text: s, fill: 'black', align: 'left', fontFamily: 'Monospace' });
            this.left_labels.push(t);
            this.shapes.add(t);
            if (s === "") continue;
            const c = new Contact({ 
                id: s, 
                offset: new PhysicalPoint(- pin_length, (i + 1) * contact_height).plain(),
            });
            this.contacts.push(this.addChild(c));
            this.pin_lines.push(new Konva.Line({ points: [0, 0, 0, 0], stroke: 'black' }));
        }
        for (let i = 0; i < this.right_pins.length; i++) {
            const s = this.right_pins[i];
            const t = new Konva.Text({ text: s, fill: 'black', align: 'right', fontFamily: 'Monospace' });
            this.right_labels.push(t);
            this.shapes.add(t);
            if (s === "") continue;
            const c = new Contact({ 
                id: s, 
                offset: new PhysicalPoint(width + pin_length, (i + 1) * contact_height).plain()
            });
            this.contacts.push(this.addChild(c));
            this.pin_lines.push(new Konva.Line({ points: [0, 0, 0, 0], stroke: 'black' }));
        }
        for (const x of this.pin_lines) this.shapes.add(x);
        this.name = new Konva.Text({ text: spec.label, align: 'center', wrap: 'none' });
        this.shapes.add(this.name);
        this.updateLayout();
        this.setupEvents();
    }
    updateLayout() {
        super.updateLayout();
        let [x, y] = pointAsNumber(this.absolutePosition().screen());
        this.rect.x(x);
        this.rect.y(y);
        const pins = Math.max(this.left_pins.length, this.right_pins.length);
        this.rect.height(((pins + 1) * contact_height) * scale());
        this.rect.width(width * scale());
        this.rect.stroke(this.mainColor());
        for (const a of this.left_labels) {
            a.fontSize(label_font_size * scale());
            a.width(contact_height * scale());
            a.fill(this.mainColor());
        }
        for (const a of this.right_labels) {
            a.fontSize(label_font_size * scale());
            a.width(contact_height * scale());
            a.fill(this.mainColor());
        }
        let j = 0;
        for (let i = 0; i < this.left_pins.length; i++) {
            this.left_labels[i].width(contact_label_width * scale());
            this.left_labels[i].x(x + gap * scale());
            this.left_labels[i].y(y + ((i + 1) * contact_height - 0.5 * label_font_size) * scale());
            if (this.left_pins[i] === "") continue;
            const cxy = this.contacts[j].absolutePosition().screen();
            cxy.setX(cxy.getX());
            this.pin_lines[j].points([cxy.x, cxy.y, x, cxy.y]);
            this.pin_lines[j].stroke(this.mainColor());
            j++;
        }
        for (let i = 0; i < this.right_pins.length; i++) {
            this.right_labels[i].width(contact_label_width * scale())
            this.right_labels[i].x(x + (width - gap - contact_label_width) * scale());
            this.right_labels[i].y(y + ((i + 1) * contact_height - 0.5 * label_font_size) * scale());
            if (this.right_pins[i] === "") continue;
            const cxy = this.contacts[j].absolutePosition().screen();
            this.pin_lines[j].points([cxy.x, cxy.y, this.rect.x() + this.rect.width(), cxy.y]);
            this.pin_lines[j].stroke(this.mainColor());
            j++;
        }
        this.name.x(x - pin_length * scale());
        this.name.y(y - (label_font_size * 2) * scale());
        this.name.width(this.rect.width() + 2 * pin_length * scale());
        this.name.fontSize(label_font_size * scale());
        this.name.fill(this.mainColor());
    }
    spec(): any {
        return {
            type_marker: marker,
            left_pins: this.left_pins,
            right_pins: this.right_pins,
            label: this.name.text(),
            super: super.spec(),
        } as IntegratedCircuitSchematicSpec;        
    }
    materialized(b?: boolean): boolean {
        // debugger;
        let z = super.materialized(b);
        if (z) {
            this.rect.attrs['address'] = this.address();
        }
        return z;
    }
    setupEvents() {
        const o = this;
        const f = (e: Konva.KonvaEventObject<MouseEvent>) => {
            e.cancelBubble = true;
            if (appActions.onMouseDown(e)) return;
            const a = new SelectAction();
            a.newSelection = [o.address()];
            appActions.current(a);
            appActions.commit();
            appActions.current(new MoveSelectionAction());
        };
        this.rect.on('mousedown', f);
        this.right_labels.forEach(x => x.on('mousedown', f));
        this.left_labels.forEach(x => x.on('mousedown', f));
    }
}