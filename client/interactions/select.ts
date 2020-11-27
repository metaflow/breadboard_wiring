import { Interaction } from "../mutation";
import Konva from "konva";
import { stage, Point, currentLayer, workspace } from "../workspace";
import { clearSelection, selectionAddresses } from "../components/selectable_component";
import theme from '../../theme.json';
import { KonvaEventObject } from "konva/types/Node";
import { SelectMutation } from "../mutations/udpate_selection";

export class SelectInteraction extends Interaction {
    rect: Konva.Rect;
    prevSelection: string[];
    constructor() {
        super();
        this.prevSelection = selectionAddresses();
        let pos = Point.cursor();
        this.rect = new Konva.Rect({
            x: pos.x,
            y: pos.y,
            stroke: theme.selection,
            strokeWidth: 1,
        });
    }
    mousemove(event: KonvaEventObject<MouseEvent>): Interaction | null {
        if (this.rect == null) return this;
        let pos = Point.cursor();
        this.rect.width(pos.x - this.rect.x());
        this.rect.height(pos.y - this.rect.y());
        clearSelection();
        selectionAddresses(this.selected());
        return null;
    }
    selected(): string[] {
        const r = this.rect.getClientRect(null);
        return stage().find('.selectable')
            .toArray()
            .filter((shape) => Konva.Util.haveIntersection(r, shape.getClientRect()))
            .map(a => a.attrs['address']);
    }
    mousedown(event: KonvaEventObject<MouseEvent>): Interaction | null {
        if (this.rect != null) return this;
        currentLayer()?.add(this.rect);
        return this;
    }
    mouseup(event: KonvaEventObject<MouseEvent>): Interaction | null {
        if (this.rect == null) return this;
        this.rect.remove();
        workspace.update(new SelectMutation(this.prevSelection, selectionAddresses()));
        return null;
    }
    cancel(): void {
        this.rect.remove();
        selectionAddresses(this.prevSelection);
    }
}