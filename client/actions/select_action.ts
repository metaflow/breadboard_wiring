import { Action, actionDeserializers } from "../action";
import Konva from "konva";
import { stage, actionLayer, ScreenPoint } from "../stage";
import { selectionAddresses } from "../components/selectable_component";

const marker = 'SelectAction';

actionDeserializers.push(function (data: any): Action | null {
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

export class SelectAction implements Action {
    rect: Konva.Rect | null = null;
    prevSelection: string[];
    newSelection: string[] = [];
    constructor() {
        this.prevSelection = selectionAddresses();
    }
    apply(): void {
        selectionAddresses(this.newSelection);
    }
    undo(): void {
        selectionAddresses(this.prevSelection);
    }
    mousemove(event: Konva.KonvaEventObject<MouseEvent>): boolean {
        if (this.rect == null) return false;
        let pos = ScreenPoint.cursor();
        this.rect.width(pos.x - this.rect.x());
        this.rect.height(pos.y - this.rect.y());
        const r = this.rect.getClientRect(null);
        var shapes = stage()?.find('.selectable');
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
        let pos = ScreenPoint.cursor();
        this.rect = new Konva.Rect({
            x: pos.x,
            y: pos.y,
            fill: 'rgba(0,0,255,0.5)',
        });
        actionLayer()?.add(this.rect);
        return false;
    }
    mouseup(event: Konva.KonvaEventObject<MouseEvent>): boolean {
        if (this.rect == null) return false;
        let pos = ScreenPoint.cursor();
        this.rect.width(pos.x - this.rect.x());
        this.rect.height(pos.y - this.rect.y());
        this.rect.remove();
        return true;
    }
    cancel(): void {
        this.rect?.remove();
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