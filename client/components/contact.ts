import Konva from "konva";
import { AddWireInteraction } from "../actions/add_wire";
import { SCHEME, workspace } from "../workspace";
import { ComponentSpec } from "./component";
import { SelectableComponent } from "./selectable_component";

export class Contact extends SelectableComponent {
    circle: Konva.Circle;
    constructor(spec: ComponentSpec) {
        super(spec);
        this.circle = new Konva.Circle({radius: 1});
        this.shapes.add(this.circle);
        this.setupEvents();
        this.updateLayout();
    }    
    setupEvents() {
        const o = this;
        this.circle.on('mousedown', function (e) {            
            if (workspace.currentInteraction()) {
                workspace.onMouseDown(e, o.stageName());
                return;
            }
            if (e.evt.button != 0) return;
            e.cancelBubble = true;
            // TODO: what if there is an existing wire attached here? How this should look like in UI?
            new AddWireInteraction(o.stageName(), o.absolutePosition());
        });
    }
    updateLayout(): void {
        super.updateLayout();
        // TODO: not 'green' use theme color.
        this.circle.stroke(this.selected() ? 'green' : this.mainColor());
        this.circle.position(this.absolutePosition());
        this.circle.strokeWidth(this.stageName() == SCHEME ? 1 : 0.5);
        this.circle.radius(this.stageName() == SCHEME ? 3 : 0.7);
    }
}