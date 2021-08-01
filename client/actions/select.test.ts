import Konva from "konva";
import { Contact } from "../components/contact";
import { deserializeMutation, SCHEME, UpdateSelectionMutation, areaLayer, Area, workspace } from "../everything";
import { mock } from 'ts-mockito';


describe('select action', () => {
  var a: Area;
  beforeAll(() => {
    jest.mock("konva");
    const stage = mock(Konva.Stage);
    a = workspace.addArea(SCHEME, stage);
  });

  it('serialize', () => {
    const m = new UpdateSelectionMutation(SCHEME, [], ['1']);
    const s: any = m.serialize();
    const n = deserializeMutation(s);
    expect(n.T()).toBe(UpdateSelectionMutation.name);
  });

  jest.mock("konva");

  test('apply', () => {
    const c = new Contact();
    c.layerName(areaLayer(SCHEME))
    c.materialized(true);
    const c2 = new Contact();
    c2.layerName(areaLayer(SCHEME));
    c2.materialized(true);
    c.selected(true);
    const m = new UpdateSelectionMutation(SCHEME, a.selectionAddresses(), [c2.address()]);
    m.apply()
    expect(c.selected()).toBe(false);
    expect(c2.selected()).toBe(true);
    m.undo();
    expect(a.selectionAddresses()).toEqual([c.address()]);
  });

});