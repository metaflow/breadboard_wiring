import { componentDeserializers, ComponentSpec } from "./component";
import Konva from "konva";
import { pointAsNumber, Point } from "../workspace";
import { Contact } from "./contact";
import { workspace } from "../workspace";
import { MoveSelectionAction } from "../mutations/move_selection";
import { SelectableComponent } from "./selectable_component";
import { SelectMutation } from "../mutations/select";
import theme from '../../theme.json';

const marker = 'IntegratedCircuitSchematic';

componentDeserializers.push(function (data: any): (IntegratedCircuitSchematic | null) {
    if (data['typeMarker'] !== marker) {
        return null
    }
    return new IntegratedCircuitSchematic(data['spec'] as IntegratedCircuitSchematicSpec);
});

// Increase values so wires shouldn't be <1 width.
const gap = 3;
const width = 60;
const contact_height = 15;
const contact_label_width = 15;
const pin_length = 15;
const label_font_size = 9;

export interface IntegratedCircuitSchematicSpec {
    typeMarker?: string;
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
            stroke: this.mainColor(),
            strokeWidth: 1,
            name: 'selectable',
        });
        this.shapes.add(this.rect);
        for (let i = 0; i < this.left_pins.length; i++) {
            const s = this.left_pins[i];
            const t = new Konva.Text({
                text: s,
                fill: this.mainColor(),
                align: 'left',
                fontFamily: 'Monospace',
            });
            this.left_labels.push(t);
            this.shapes.add(t);
            if (s === "") continue;
            const c = new Contact({
                id: s,
                offset: new Point(- pin_length, (i + 1) * contact_height).plain(),
            });
            this.contacts.push(this.addChild(c));
            this.pin_lines.push(new Konva.Line({
                points: [],
            }));
        }
        for (let i = 0; i < this.right_pins.length; i++) {
            const s = this.right_pins[i];
            const t = new Konva.Text({
                text: s,
                fill: this.mainColor(),
                align: 'right',
                fontFamily: 'Monospace',
            });
            this.right_labels.push(t);
            this.shapes.add(t);
            if (s === "") continue;
            const c = new Contact({
                id: s,
                offset: new Point(width + pin_length, (i + 1) * contact_height).plain()
            });
            this.contacts.push(this.addChild(c));
            this.pin_lines.push(new Konva.Line({
                points: [],
            }));
        }
        for (const x of this.pin_lines) this.shapes.add(x);
        this.name = new Konva.Text({ text: spec.label, align: 'center', wrap: 'none' });
        this.shapes.add(this.name);
        this.updateLayout();
        this.setupEvents();
    }
    updateLayout() {
        super.updateLayout();
        let [x, y] = pointAsNumber(this.absolutePosition());
        this.rect.x(x);
        this.rect.y(y);        
        const pins = Math.max(this.left_pins.length, this.right_pins.length);
        this.rect.height(((pins + 1) * contact_height));
        this.rect.width(width);
        this.rect.stroke(this.mainColor());
        for (const a of this.left_labels) {
            a.fontSize(label_font_size);
            a.width(contact_height);
            a.fill(this.mainColor());
        }
        for (const a of this.right_labels) {
            a.fontSize(label_font_size);
            a.width(contact_height);
            a.fill(this.mainColor());
        }
        let j = 0;
        this.pin_lines.forEach(pl => {
            pl.stroke(this.mainColor());
            pl.strokeWidth(1);
        })
        for (let i = 0; i < this.left_pins.length; i++) {
            this.left_labels[i].width(contact_label_width);
            this.left_labels[i].x(x + gap);
            this.left_labels[i].y(y + ((i + 1) * contact_height - 0.5 * label_font_size));
            if (this.left_pins[i] === "") continue;
            const cxy = this.contacts[j].absolutePosition().plain();
            // cxy.setX(cxy.x);
            this.pin_lines[j].points([cxy.x, cxy.y, x, cxy.y]);
            this.pin_lines[j].stroke(this.mainColor());
            j++;
        }
        for (let i = 0; i < this.right_pins.length; i++) {
            this.right_labels[i].width(contact_label_width)
            this.right_labels[i].x(x + (width - gap - contact_label_width));
            this.right_labels[i].y(y + ((i + 1) * contact_height - 0.5 * label_font_size));
            if (this.right_pins[i] === "") continue;
            const cxy = this.contacts[j].absolutePosition().plain();
            this.pin_lines[j].points([cxy.x, cxy.y, this.rect.x() + this.rect.width(), cxy.y]);
            this.pin_lines[j].stroke(this.mainColor());
            j++;
        }
        this.name.x(x - pin_length);
        this.name.y(y - (label_font_size * 2));
        this.name.width(this.rect.width() + 2 * pin_length);
        this.name.fontSize(label_font_size);
        this.name.fill(this.mainColor());
    }
    serialize(): any {
        return {
            typeMarker: marker,
            left_pins: this.left_pins,
            right_pins: this.right_pins,
            label: this.name.text(),
            super: super.serialize(),
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
            if (workspace.currentAction()) {
                workspace.onMouseDown(e);
                return;
            }
            if (e.evt.button != 0) return;
            e.cancelBubble = true;
            if (!this.selected()) {
                const a = new SelectMutation();
                a.newSelection = [o.address()];
                workspace.currentAction(a);
                workspace.update();
            }
            workspace.currentAction(new MoveSelectionAction());
        };
        this.rect.on('mousedown', f);
        this.right_labels.forEach(x => x.on('mousedown', f));
        this.left_labels.forEach(x => x.on('mousedown', f));
    }
}