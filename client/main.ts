/**
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import hotkeys from 'hotkeys-js';
import Konva from 'konva';
import Split from 'split.js';
import theme from '../theme.json';
import { AddComponentInteraction, AddWireInteraction, AreaNameT, Breadboard, checkT, ComponentSpec, deserializeComponent, ic74x245, layer, onError, PHYSICAL, SCHEME, SelectInteraction, stageLayer, workspace } from './everything';
 
window.onerror = (errorMsg, url, lineNumber) => {
  onError(errorMsg, url, lineNumber);
  return false;
};

(window as any).add245 = function () {
  new AddComponentInteraction(SCHEME, [new ic74x245()]);
};

(window as any).add245physical = function () {
  console.log('add245physical');
  const c = new ic74x245();
  new AddComponentInteraction(PHYSICAL, [c]);
};

(window as any).clearActionsHistory = function () {
  localStorage.setItem('actions_history', JSON.stringify([]));
  location.reload();
};

(window as any).addOrthogonal = function() {
  workspace.cancelInteractions();
  new AddWireInteraction(SCHEME);
};

(window as any).toolSelect = function() {
  workspace.cancelInteractions();
  new SelectInteraction(SCHEME);
};

(window as any).selectPhysical = function() {
  workspace.cancelInteractions();
  new SelectInteraction(PHYSICAL);
};

(window as any).deleteSelection = deleteSelection;

(window as any).downloadSchematic = function() {
  let w = workspace.serialize();
  delete w.history;
  var text = JSON.stringify(w),
    blob = new Blob([text], { type: 'text/plain' }),
    anchor = document.createElement('a');
  console.log(w, text);
  anchor.download = "scheme.bbw";
  anchor.href = (window.webkitURL || window.URL).createObjectURL(blob);
  anchor.dataset.downloadurl = ['text/plain', anchor.download, anchor.href].join(':');
  anchor.click();
};

(window as any).addBreadboard = () => {
  const c = new Breadboard();
  new AddComponentInteraction(PHYSICAL, [c]);
};

(window as any).toggleGridAlignment = function(a: HTMLInputElement) {
  const area = a.closest('.area');
  const s = AreaNameT.check(area?.getAttribute('data-stage'));
  workspace.area(s).gridAlignment(a.checked ? 20 : null);
}

const fileSelector = document.getElementById('file-selector') as HTMLInputElement;
fileSelector?.addEventListener('change', () => {  
  const fileList = fileSelector.files;
  if (fileList == null) return;
  const file = fileList.item(0);
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener('load', (event) => {    
    const s = event.target?.result;
    if (checkT(s, 'string')) {      
      workspace.deserialize(JSON.parse(s));
      fileSelector.value = '';
    }
  });
  reader.readAsText(file);
});

function deleteSelection() {
  /*TODO:
  workspace.cancelInteractions();  
  const cc = selectionRoots().map(c => c.serialize());
  workspace.update(new DeleteComponentsMutation(cc, selectionAddresses()));
  */
}

workspace.addArea(SCHEME, new Konva.Stage({
  container: 'scheme',
  width: window.screen.width,
  height: window.screen.height,
}));
workspace.area(SCHEME).stage.container().style.backgroundColor = theme.backgroud;
{
  // TODO: setup layers in Area directly.
  const x = layer(stageLayer(SCHEME), new Konva.Layer());
  x.scaleX(2);
  x.scaleY(2);
  workspace.area(SCHEME).stage.add(x);
}

workspace.addArea(PHYSICAL, new Konva.Stage({
  container: 'physical',
  width: window.screen.width,
  height: window.screen.height,
}));
workspace.area(PHYSICAL).stage.container().style.backgroundColor = theme.backgroud;
{
  const x = layer(stageLayer(PHYSICAL), new Konva.Layer());
  x.scaleX(2);
  x.scaleY(2);
  workspace.area(PHYSICAL).stage.add(x);
}

document.getElementById('scheme')?.addEventListener('contextmenu', e => {
  e.preventDefault();
});

document.getElementById('physical')?.addEventListener('contextmenu', e => {
  e.preventDefault();
});

workspace.setupEvents();

hotkeys('esc', function (e) {
  e.preventDefault();
  workspace.cancelInteractions();
});

hotkeys('ctrl+z', function (e) {
  e.preventDefault();
  workspace.undo();
});

hotkeys('ctrl+y', function (e) {
  e.preventDefault();
  workspace.redo();
});

hotkeys('del', function () {
  deleteSelection();
});

hotkeys('ctrl+c', function () {
  /* TODO: for active area
  const ss = selectionRoots().map(c => {
    const s: ComponentSpec = c.serialize();
    delete(s.id);
    return s;
  });
  if (ss.length == 0) return;
  const t = JSON.stringify(ss);  
  navigator.clipboard.writeText(t).catch(() => {
    throw new Error('failed to write to clipboard');
  });
  */
});

hotkeys('ctrl+x', function () {
  /* TODO: cut for active area 
  const ss = selectionRoots().map(c => {
    const s: ComponentSpec = c.serialize();
    delete(s.id);
    return s;
  });
  if (ss.length == 0) return;
  const t = JSON.stringify(ss);  
  navigator.clipboard.writeText(t).catch(() => {
    throw new Error('failed to write to clipboard');
  });
  deleteSelection();
  */
});

hotkeys('ctrl+v', function () {  
  navigator.clipboard.readText().then(txt => {
    const ss = JSON.parse(txt);
    // TODO: not scheme, should be based on component space.
    new AddComponentInteraction(SCHEME, ss.map((a: ComponentSpec) => {
      return deserializeComponent(a);
    }));
  });
});

workspace.loadFromLocalHistory();

Split(['#scheme-area', '#physical-area'], {
  minSize: 100,
  gutterSize: 3,
  direction: 'vertical',
});