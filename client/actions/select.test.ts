/**
 * @jest-environment puppeteer
 */

import Konva from "konva";
import { Contact } from "../components/contact";
import { Area, LayerNameT, deserializeMutation, SCHEME, UpdateSelectionMutation, areaLayer } from "../everything";

test('serialize', () => {
  const m = new UpdateSelectionMutation(SCHEME, [], ['1']);
  const s: any = m.serialize();
  const n = deserializeMutation(s);
  expect(n.T()).toBe(UpdateSelectionMutation.name);
});

test('apply', () => {
  document.body.innerHTML = '<div id="stage"></stage>';
  const a = new Area(SCHEME, new Konva.Stage({
    container: 'stage',
  }));
  const c = new Contact();
  c.layerName(areaLayer(SCHEME))
  c.materialized(true);
  console.log(c.id());
  c.selected(true);
  expect(a.selection).toBe([]);
});