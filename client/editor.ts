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
import { MoveSelectionAction } from './actions/move_selection';

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

(window as any).moveSelection = function() {
  appActions.current(new MoveSelectionAction());
}

function deleteSelection() {
  appActions.current(new DeleteSelectionAction());
  appActions.commit();
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

stage()?.add(defaultLayer(new Konva.Layer()));
stage()?.add(actionLayer(new Konva.Layer()));

stage()?.on('mousemove', function (e: Konva.KonvaEventObject<MouseEvent>) {
  appActions.onMouseMove(e);
});

stage()?.on('mousedown', function (e) {
  e.evt.preventDefault(); // Disable scroll on middle button click.
  if (appActions.onMouseDown(e)) {
    return;
  }
  // No action.  
  if (e.evt.button != 0 && selection().length > 0) {
    const a = new SelectAction();
    appActions.current(a);
    appActions.commit();
  }
});

stage()?.on('mouseup', function(e) { appActions.onMouseUp(e); });

hotkeys('esc', function (e) {
  e.preventDefault();
  appActions.cancelCurrent();
});

hotkeys('ctrl+z', function (e) {
  e.preventDefault();
  appActions.undo();
});

hotkeys('ctrl+y', function (e) {
  e.preventDefault();
  appActions.redo();
});

hotkeys('del', function (e) {
  deleteSelection();
});

gridAlignment(5); // TODO: make grid algnment change an action.
appActions.load();