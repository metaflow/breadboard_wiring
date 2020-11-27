import { Mutation, actionDeserializers, ActionState } from "../mutation";
import Konva from "konva";
import { stage, Point, currentLayer } from "../workspace";
import { selectionAddresses } from "../components/selectable_component";
import theme from '../../theme.json';

const marker = 'SelectAction';

actionDeserializers.push(function (data: any, state: ActionState): Mutation | null {
    if (data['typeMarker'] !== marker) return null;
    const s: SelectActionSpec = data;
    let z = new SelectAction();
    z.newSelection = s.newSelection;
    z.prevSelection = s.prevSelection;
    return z;
});

interface SelectActionSpec {
    typeMarker: 'SelectAction';
    prevSelection: string[];
    newSelection: string[];
}

export class SelectAction extends Mutation {
    rect: Konva.Rect | null = null;
    prevSelection: string[] = [];
    newSelection: string[] = [];
    private constructor() {
        super();
    }
    begin() {
        super.begin();
        this.prevSelection = selectionAddresses();
    }
    apply() {
        super.apply();
        selectionAddresses(this.newSelection);
    }
    undo() {
        super.undo();
        selectionAddresses(this.prevSelection);
    }
    cancel(): void {
        super.cancel();
        this.rect?.remove();
    }
    mousemove(event: Konva.KonvaEventObject<MouseEvent>): boolean {
        if (this.rect == null) return false;
        let pos = Point.cursor();
        this.rect.width(pos.x - this.rect.x());
        this.rect.height(pos.y - this.rect.y());
        const r = this.rect.getClientRect(null);
        var shapes = stage().find('.selectable');
        if (shapes == null) return true;
        var selected = shapes.toArray().filter((shape) => {
            return Konva.Util.haveIntersection(r, shape.getClientRect());
        });
        this.newSelection = [];
        for (const s of selected) {
            const a = s.attrs['address'];
            this.newSelection.push(a);
        }
        this.apply();
        return false;
    }
    mousedown(event: Konva.KonvaEventObject<MouseEvent>): boolean {
        let pos = Point.cursor();
        this.rect = new Konva.Rect({
            x: pos.x,
            y: pos.y,
            stroke: theme.selection,
            strokeWidth: 1,
        });
        currentLayer()?.add(this.rect);
        return false;
    }
    mouseup(event: Konva.KonvaEventObject<MouseEvent>): boolean {
        if (this.rect == null) return false;
        let pos = Point.cursor();
        this.rect.width(pos.x - this.rect.x());
        this.rect.height(pos.y - this.rect.y());
        this.rect.remove();
        return true;
    }
    serialize() {
        let z: SelectActionSpec = {
            typeMarker: marker,
            prevSelection: this.prevSelection,
            newSelection: this.newSelection,
        };
        return z;
    }
}