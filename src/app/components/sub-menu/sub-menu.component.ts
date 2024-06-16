import { Component, ViewEncapsulation } from '@angular/core';

@Component({
    selector: 'app-sub-menu',
    host: { style: 'display: block' },
    templateUrl: './sub-menu.component.html',
    styleUrls: ['./sub-menu.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class SubMenuComponent {}
