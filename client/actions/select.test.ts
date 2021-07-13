import { deserializeMutation } from "../mutation";
import { SCHEME } from "../workspace";
import { UpdateSelectionMutation } from "./select";

test('serialize', () => {
  const m = new UpdateSelectionMutation(SCHEME, [], ['1']);
  const s: any = m.serialize();
  console.log(s);
  const n = deserializeMutation(s);
  // expect(n.T).toBe(UpdateSelectionMutation.name);
});

test('2 == 2', () => {
  expect(2).toBe(2);
});