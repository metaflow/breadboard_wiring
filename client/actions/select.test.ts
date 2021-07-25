import Konva from "konva";
import { Contact } from "../components/contact";
import { deserializeMutation, SCHEME, UpdateSelectionMutation, areaLayer } from "../everything";
import { mock } from 'ts-mockito';
import { workspace } from "../workspace";

describe('select action', () => {

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

it('serialize', () => {
  const m = new UpdateSelectionMutation(SCHEME, [], ['1']);
  const s: any = m.serialize();
  const n = deserializeMutation(s);
  expect(n.T()).toBe(UpdateSelectionMutation.name);
});

jest.mock("konva");

test('apply', () => {
    const stage = mock(Konva.Stage);
    const a = workspace.addArea(SCHEME, stage);
    const c = new Contact();
    c.layerName(areaLayer(SCHEME))
    c.materialized(true);
    console.log(c.id());
    c.selected(true);
    expect(a.selection().map(c => c.id())).toEqual([0]);
});

});