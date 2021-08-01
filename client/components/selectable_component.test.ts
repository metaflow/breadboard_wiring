import Konva from "konva";
import { Contact } from "../components/contact";
import { deserializeMutation, SCHEME, UpdateSelectionMutation, areaLayer } from "../everything";
import { mock } from 'ts-mockito';
import { Area, workspace } from "../workspace";

describe('selectable component', () => {
  var a: Area;
  beforeAll(() => {
    jest.mock("konva");
    const stage = mock(Konva.Stage);
    a = workspace.addArea(SCHEME, stage);
  });

  test('select and deselect', () => {
    const c = new Contact();
    c.layerName(areaLayer(SCHEME))
    c.materialized(true);
    c.selected(true);
    expect(a.selection().map(c => c.id())).toEqual([c.id()]);
    c.selected(false);
    expect(a.selection().map(c => c.id())).toEqual([]);
  });

  test('clear selection', () => {
    const c = new Contact();
    c.layerName(areaLayer(SCHEME))
    c.materialized(true);
    c.selected(true);
    expect(a.selection().map(c => c.id())).toEqual([c.id()]);
    a.clearSelection();
    expect(a.selection().map(c => c.id())).toEqual([]);
  });

});