/**
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Konva from "konva";
import theme from '../../theme.json';
import { Component, ComponentSpec, Contact, Point } from "../everything";

const gap = 1;
const height = 2.54 * 2;
const contact_width = 2.54;
const pin_length = 2.54 / 2;
const label_font_size = 2.5;
const arc_r = 1;

interface IntegratedCircuitSpec {
    pins: string[];
    label: string;
    super: ComponentSpec;
};

export class IntegratedCircuit extends Component {
    rect: Konva.Rect;
    labels: Konva.Text[] = [];
    name: Konva.Text;
    arc: Konva.Arc;

    pins: string[];
    contacts: Contact[] = [];
    constructor(spec: IntegratedCircuitSpec) {
        super(spec.super);
        this.pins = spec.pins;
        this.rect = new Konva.Rect({
            stroke: theme.foreground,
            strokeWidth: 1,
        });
        this.shapes.add(this.rect);
        for (const s of this.pins) {
            const t = new Konva.Text({ 
                text: s, 
                fill: theme.foreground,
            });
            this.labels.push(t);
            // spec.layer.add(t);
        }
        const w = Math.floor((this.pins.length + 1) / 2);
        for (let i = 0; i < w; i++) {
            const c = new Contact({
                T: '',
                offset: new Point((i + 0.5) * contact_width + gap, height + pin_length).plain(),
                layerName: '',
            });
            this.addChild(c);
            this.contacts.push(c);
        }
        for (let i = w; i < this.pins.length; i++) {
            let c = new Contact({
                T: '',
                offset: new Point((this.pins.length - i - 1 + 0.5) * contact_width + gap, -pin_length).plain(),
                layerName: '',
            });
            this.addChild(c);
            this.contacts.push(c);
        }
        this.name = new Konva.Text({ text: spec.label, align: 'center' });
        this.shapes.add(this.name);
        this.arc = new Konva.Arc({ 
            angle: 180, 
            rotation: -90, 
            innerRadius: 10, 
            outerRadius: 10, 
            stroke: this.mainColor(),
        });
        this.shapes.add(this.arc);
    }

    updateLayout() {
        super.updateLayout();
        let [x, y] = this.absolutePosition().array();
        const w = Math.floor((this.pins.length + 1) / 2);
        this.rect.x(x);
        this.rect.y(y);
        this.rect.width((w * contact_width + gap * 2));
        this.rect.height(height);
        for (const a of this.labels) {
            a.fontSize(label_font_size);
            a.fontFamily('Monospace');
            a.align('center');
            a.width(contact_width);
            a.height(5)
        }
        for (let i = 0; i < w; i++) {
            this.labels[i].x(x + (gap + (i) * contact_width));
            this.labels[i].y(y + (height - gap - label_font_size));
        }
        for (let i = w; i < this.pins.length; i++) {
            this.labels[i].x(x + (gap + (this.pins.length - i - 1) * contact_width));
            this.labels[i].y(y + gap);
        }
        this.name.x(x);
        this.name.y(y + ((height - label_font_size) * 0.5));
        this.name.width(this.rect.width());
        this.name.fontSize(label_font_size);
        this.arc.innerRadius(arc_r);
        this.arc.outerRadius(arc_r);
        this.arc.x(x);
        this.arc.y(y + height / 2);
    }
}