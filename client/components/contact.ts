import Konva from "konva";
import { AddWireInteraction } from "../actions/add_wire";
import { workspace } from "../workspace";
import { ComponentSpec } from "./component";
import { SelectableComponent } from "./selectable_component";

const radius = 2;

export class Contact extends SelectableComponent {
    circle: Konva.Circle;
    constructor(spec: ComponentSpec) {
        super(spec);
        this.circle = new Konva.Circle({
            radius: 1,
        });
        this.shapes.add(this.circle);
        this.setupEvents();
        this.updateLayout();
    }    
    setupEvents() {
        const o = this;
        this.circle.on('mousedown', function (e) {            
            if (workspace.currentInteraction()) {
                workspace.onMouseDown(e);
                return;
            }
            if (e.evt.button != 0) return;
            e.cancelBubble = true;
            // TODO: if there is an existing wire.
            new AddWireInteraction(o.absolutePosition());
        });
    }
    updateLayout(): void {
        super.updateLayout();
        this.circle.fill(this.selected() ? 'green' : this.mainColor());
        this.circle.position(this.absolutePosition());
        this.circle.radius(radius);
    }
}