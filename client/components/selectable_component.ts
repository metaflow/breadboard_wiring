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

import { Component } from "./component";
import { checkT } from "../utils";
import theme from '../../theme.json';

export class SelectableComponent extends Component {
    _selected: boolean = false;
    selected(v?: boolean): boolean {
        if (v !== undefined) {
            if (this._selected != v) {
                this._selected = v;                
                this.mainColor(v ? theme.selection : theme.foreground);
                if (v) {
                    this.area()._selection.add(this);
                } else {
                    this.area()._selection.delete(this);
                }
            }
        }
        return this._selected;
    }
    materialized(b?: boolean): boolean {
        const z = super.materialized(b);
        if (b === false) {
            this.selected(false);
        }
        return z;
    }
}