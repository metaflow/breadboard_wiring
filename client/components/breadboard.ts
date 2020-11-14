import Konva from 'konva';
import { scale, PhysicalPoint } from '../stage';
import { Contact } from './contact';
import { Component, ComponentSpec } from './component';
import assertExists from 'ts-assert-exists';

const p_width = 170.5;
const p_height = 63.1;
const p_contact = 2.54;

export class Breadboard extends Component {

    contacts = new Map<string, Contact>();
    rect: Konva.Rect;
    constructor(spec?: ComponentSpec) {
        super(spec);
        let left = (p_width - p_contact * 62) / 2;
        let top = (p_height - 19 * p_contact) / 2;
        const letters = "yz  abcde  fghij  kl";
        for (let i = 0; i < 63; i++) {
            for (let j = 0; j < 20; j++) {
                if (j == 2 || j == 3 || j == 9 || j == 10 || j == 16 || j == 17) continue;
                if ((j == 0 || j == 1 || j == 18 || j == 19) &&
                    (i == 0 || ((i - 1) % 6 == 0) || i == 62)) continue;
                const c = new Contact({
                    id: letters[j] + (i + 1), 
                    offset: new PhysicalPoint(left + i * p_contact, top + j * p_contact).plain(),
                });
                this.addChild(c);
                this.contacts.set(assertExists(c.id()), c);
            }
        }
        this.rect = new Konva.Rect({            
            fill: '#EBEDE4',
            stroke: 'black',
            strokeWidth: 1,
        });
        this.shapes.add(this.rect);
        this.updateLayout();
    }
    updateLayout(): void {
        super.updateLayout();
        this.rect.position(this.absolutePosition().screen());
        this.rect.height(p_height * scale());
        this.rect.width(p_width * scale());
    }
}