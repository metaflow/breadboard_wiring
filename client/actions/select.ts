import { Mutation, Interaction, mutationDeserializers } from "../mutation";
import Konva from "konva";
import { schemeStage, Point, schemeLayer, workspace } from "../workspace";
import { clearSelection, selectionAddresses } from "../components/selectable_component";
import { KonvaEventObject } from "konva/types/Node";
import theme from '../../theme.json';
import { classToPlain, plainToClass } from "class-transformer";

export class SelectInteraction extends Interaction {
    rect: Konva.Rect|null = null;
    prevSelection: string[];
    constructor() {
        super();
        this.prevSelection = selectionAddresses();        
    }
    mousemove(event: KonvaEventObject<MouseEvent>): Interaction | null {
        if (this.rect == null) return this;
        let pos = Point.cursor();
        this.rect.width(pos.x - this.rect.x());
        this.rect.height(pos.y - this.rect.y());        
        workspace.invalidateScene();
        selectionAddresses(this.selected());
        return this;
    }
    selected(): string[] {
        if (this.rect == null) return [];
        const r = this.rect.getClientRect(null);
        return schemeStage().find('.selectable')
            .toArray()
            .filter((shape) => Konva.Util.haveIntersection(r, shape.getClientRect()))
            .map(a => a.attrs['address']);
    }
    mousedown(event: KonvaEventObject<MouseEvent>): Interaction | null {
        if (this.rect != null) return this;
        let pos = Point.cursor();
        this.rect = new Konva.Rect({
            x: pos.x,
            y: pos.y,
            stroke: theme.selection,
            strokeWidth: 1,
        });
        schemeLayer().add(this.rect);
        return this;
    }
    mouseup(event: KonvaEventObject<MouseEvent>): Interaction | null {
        this.rect?.remove();
        workspace.invalidateScene();
        workspace.update(new UpdateSelectionMutation(this.prevSelection, selectionAddresses()));        
        return null;
    }
    cancel(): void {
        this.rect?.remove();
        selectionAddresses(this.prevSelection);
    }
}

export class UpdateSelectionMutation extends Mutation {
    prevSelection: string[] = [];
    newSelection: string[] = [];
    constructor(prevSelection: string[], newSelection: string[]) {
        super();
        this.prevSelection = prevSelection;
        this.newSelection = newSelection;
    }
    apply() {
        selectionAddresses(this.newSelection);
    }
    undo() {
        selectionAddresses(this.prevSelection);
    }
}

mutationDeserializers.set(UpdateSelectionMutation.name, (d: object) => {
    return plainToClass(UpdateSelectionMutation, d);
});