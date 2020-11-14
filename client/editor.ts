import Konva from 'konva';
import hotkeys from 'hotkeys-js';
import { appActions } from './action';
import { stage, defaultLayer, actionLayer, gridAlignment } from './stage';
import { SelectAction } from './actions/select_action';
import { ic74x245 } from './components/74x245';
import { PlaceComponentAction } from './actions/add_ic_action';
import { AddWireAction } from './actions/add_wire';
import { selection } from './components/selectable_component';
import { DeleteSelectionAction } from './actions/delete_action';
import { backgroundColor } from './theme';

(window as any).add245 = function () {
  appActions.current(new PlaceComponentAction(new ic74x245()));
};

(window as any).clearActionsHistory = function () {
  localStorage.setItem('actions_history', JSON.stringify([]));
  location.reload();
};

(window as any).addOrthogonal = function() {
  appActions.current(new AddWireAction());
};

(window as any).toolSelect = function() {
  appActions.current(new SelectAction());
};

(window as any).deleteSelection = deleteSelection;

function deleteSelection() {
  appActions.current(new DeleteSelectionAction());
  appActions.commit();
  defaultLayer()?.batchDraw();
  actionLayer()?.batchDraw();
}

// first we need to create a stage
stage(new Konva.Stage({
  container: 'container',   // id of container <div>
  width: 1000,
  height: 1000,
}));

stage()!.container().style.backgroundColor = backgroundColor;

document.getElementById('container')?.addEventListener('contextmenu', e => {
  e.preventDefault()
});

// then create layer
stage()?.add(defaultLayer(new Konva.Layer()));
stage()?.add(actionLayer(new Konva.Layer()));
// Background color.
// defaultLayer()?.add(new Konva.Rect({
//   x: 0, y: 0, width: 1000, height: 1000, fill: '#FAFAFA',
// }))

stage()?.on('mousemove', function (e: Konva.KonvaEventObject<MouseEvent>) {
  if (appActions.onMouseMove(e)) {
    actionLayer()?.batchDraw();
    defaultLayer()?.batchDraw();
    return;
  }
});

stage()?.on('mousedown', function (e) {
  e.evt.preventDefault(); // Disable scroll on middle button click.
  if (appActions.onMouseDown(e)) {
    defaultLayer()?.batchDraw();
    actionLayer()?.batchDraw();
    return;
  }
  // No action.  
  if (e.evt.button != 0 && selection().length > 0) {
    const a = new SelectAction();
    appActions.current(a);
    appActions.commit();
    defaultLayer()?.batchDraw();
    actionLayer()?.batchDraw();
  }
});

stage()?.on('mouseup', function (e) {
  if (appActions.onMouseUp(e)) {
    defaultLayer()?.batchDraw();
    actionLayer()?.batchDraw();
    return;
  }
});

hotkeys('esc', function (e) {
  e.preventDefault();
  appActions.cancelCurrent();
  defaultLayer()?.batchDraw();
  actionLayer()?.batchDraw();
});

hotkeys('ctrl+z', function (e) {
  e.preventDefault();
  appActions.undo();
  defaultLayer()?.batchDraw();
  actionLayer()?.batchDraw();
});

hotkeys('ctrl+y', function (e) {
  e.preventDefault();
  appActions.redo();
  defaultLayer()?.batchDraw();
  actionLayer()?.batchDraw();
});

hotkeys('del', function (e) {
  deleteSelection();
});

gridAlignment(5); // TODO: make grid algnment change an action.
appActions.load();
defaultLayer()?.batchDraw();
actionLayer()?.batchDraw();