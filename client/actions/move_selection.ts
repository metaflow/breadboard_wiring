import { Mutation, Interaction } from "../mutation";
import { KonvaEventObject } from "konva/types/Node";
import { Point, stage, currentLayer, workspace } from "../workspace";
import { all } from "../address";
import { Component, deserializeComponent } from "../components/component";
import { moveSingleWire, Wire, WirePoint } from "../components/wire";
import { selectionByType, selectionAddresses } from "../components/selectable_component";
import { Contact } from "../components/contact";
import { MoveComponentMutation } from "./move_component";
import assertExists from "ts-assert-exists";
import { typeGuard } from "../utils";
import theme from '../../theme.json';
import { CompoundMutation } from "./compound";
import { UpdateWireSpecMutation } from "./update_wire_spec";
import { UpdateSelectionMutation } from "./select";
import { DeleteComponentsMutation } from "./delete_action";

export class MoveSelectionInteraction extends Interaction {
    from: Point;
    components: Component[] = [];
    auxComponents: Component[];
    selection: string[];
    wires = new Map<Wire, [string[], Wire]>();  // Map of "original wire" => (id of affected points, aux wire).
    constructor() {
        super();
        this.selection = selectionAddresses();
        this.from = Point.cursor();
        this.components = selectionByType(Component).filter(c => !typeGuard(c, WirePoint));
        this.auxComponents = this.components.map(c => {
            const x = deserializeComponent(c.serialize());
            x.mainColor(theme.active);
            x.show(currentLayer());
            c.hide();
            return x;
        });
        const points = selectionByType(WirePoint);
        const cc = this.components.flatMap((c: Component) => c.descendants(Contact));
        const attached = all(WirePoint).filter((p: WirePoint) => {
            return cc.some((c: Contact) => c.absolutePosition().closeTo(p.absolutePosition()));
        });
        points.push(...(attached.filter((p: WirePoint) => points.indexOf(p) == -1)));
        for (const p of points) {
            if (!this.wires.has(p.wire())) {
                const w = new Wire();
                w.mainColor(theme.active);
                w.show(currentLayer());
                w.alwaysShowPoints = true;
                w.pointsSpec(p.wire().pointsSpec());
                p.wire().hide();
                this.wires.set(p.wire(), [[], w]);
            }
            this.wires.get(p.wire())![0].push(assertExists(p.id()));
        }
        stage()!.container()!.setAttribute('style', 'cursor: move');
    }
    cancel() {
        this.components.forEach(c => c.show(currentLayer()));
        this.wires.forEach((v, k) => {
            if (k.materialized()) k.show(currentLayer());
            v[1].remove();
        });
        this.auxComponents.forEach(c => c.remove());
        stage()!.container()!.setAttribute('style', 'cursor: auto');
    }
    mousemove(e: KonvaEventObject<MouseEvent>): Interaction | null {
        const d = Point.cursor().sub(this.from);
        this.auxComponents.forEach((c, i) => {
            c.offset(this.components[i].offset().add(d).alignToGrid());
            c.updateLayout();
        });
        this.wires.forEach((v, k) => {
            v[1].pointsSpec(moveSingleWire(d, k.pointsSpec(), v[0]));
        });
        workspace.invalidateScene();
        return this;
    }
    mouseup(event: KonvaEventObject<MouseEvent>): Interaction | null {
        const mm: Mutation[] = [];
        // Add selection of the current selection to make proper undo.
        mm.push(new UpdateSelectionMutation(this.selection, this.selection));
        this.components.forEach((c, i) => {
            mm.push(new MoveComponentMutation(c.address(), c.offset().plain(), this.auxComponents[i].offset().plain()));
        });
        this.wires.forEach((v, k) => {
            const points = v[1].pointsSpec();
            if (points.length < 2) {
                mm.push(new DeleteComponentsMutation([k.serialize()], []));
            } else {
                mm.push(new UpdateWireSpecMutation(k.address(), k.pointsSpec(), v[1].pointsSpec()));
            }            
        });
        workspace.update(new CompoundMutation(mm));
        this.cancel();
        return null;
    }
}
