import Konva from 'konva';
import { Point, workspace } from '../workspace';
import { Contact } from './contact';
import { componentDeserializers, ComponentSpec } from './component';
import theme from '../../theme.json';
import { SelectableComponent, selectionAddresses } from './selectable_component';
import { UpdateSelectionMutation } from '../actions/select';
import { MoveSelectionInteraction } from '../actions/move_selection';

const p_width = 170.5;
const p_height = 63.1;
const p_contact = 2.54;

export class Breadboard extends SelectableComponent {
    contacts: Contact[] = [];
    rect: Konva.Rect;
    constructor(spec?: ComponentSpec) {
        super(spec);
        let left = (p_width - p_contact * 62) / 2;
        let top = (p_height - 19 * p_contact) / 2;
        for (let i = 0; i < 63; i++) {
            for (let j = 0; j < 20; j++) {
                if (j == 2 || j == 3 || j == 9 || j == 10 || j == 16 || j == 17) continue;
                if ((j == 0 || j == 1 || j == 18 || j == 19) &&
                    (i == 0 || ((i - 1) % 6 == 0) || i == 62)) continue;
                const c = new Contact({
                    T: '',
                    offset: new Point(left + i * p_contact, top + j * p_contact).plain(),
                    layerName: '',
                });
                this.addChild(c);
                this.contacts.push(c);
            }
        }
        this.rect = new Konva.Rect({
            fill: theme.breadboard,
            stroke: theme.foreground,
            strokeWidth: 1,
        });
        this.shapes.add(this.rect);
        this.updateLayout();
        this.setupEvents();
    }
    setupEvents() {
        const o = this;
        const f = (e: Konva.KonvaEventObject<MouseEvent>) => {
            if (workspace.currentInteraction()) {
                o.area().onMouseDown(e);
                return;
            }
            if (e.evt.button != 0) return;
            e.cancelBubble = true;
            if (!this.selected()) {
                workspace.update(new UpdateSelectionMutation(selectionAddresses(), [o.address()]));
            }
            new MoveSelectionInteraction(o.areaName());
        };
        this.rect.on('mousedown', f);
    }
    updateLayout(): void {
        super.updateLayout();
        this.rect.position(this.absolutePosition());
        this.rect.height(p_height);
        this.rect.width(p_width);
    }
}

componentDeserializers.set(Breadboard.name, function (data: ComponentSpec): Breadboard {
    return new Breadboard(data);
});