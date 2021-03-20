import Konva from "konva";
import { AddWireInteraction } from "../actions/add_wire";
import { SCHEME, workspace } from "../workspace";
import { ComponentSpec } from "./component";
import { SelectableComponent } from "./selectable_component";
import theme from '../../theme.json';

export class Contact extends SelectableComponent {
    circle: Konva.Circle;
    constructor(spec: ComponentSpec) {
        super(spec);
        this.circle = new Konva.Circle({radius: 1});
        this.shapes.add(this.circle);
        this.setupEvents();
    }    
    setupEvents() {
        const o = this;
        this.circle.on('mousedown', function (e) {            
            if (workspace.currentInteraction()) {
                o.area().onMouseDown(e);
                return;
            }
            if (e.evt.button != 0) return;
            e.cancelBubble = true;
            // TоыODO: what if there is an existing wire attached here? How this should look like in UI?
            new AddWireInteraction(o.areaName(), o.absolutePosition());
        });
    }
    updateLayout() {
        super.updateLayout();
        this.circle.stroke(this.selected() ? theme.selection : this.mainColor());
        this.circle.position(this.absolutePosition());
        this.circle.strokeWidth(this.areaName() == SCHEME ? 1 : 0.5);
        this.circle.radius(this.areaName() == SCHEME ? 3 : 0.7);
    }
}