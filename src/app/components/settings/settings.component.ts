import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { BaseSettings } from '../../common/settings/base-settings';

@Component({
    selector: 'app-settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class SettingsComponent implements OnInit {
    constructor(private settings: BaseSettings) {}

    public get useSystemTitleBarChecked(): boolean {
        return this.settings.useSystemTitleBar;
    }
    public set useSystemTitleBarChecked(v: boolean) {
        this.settings.useSystemTitleBar = v;
    }

    public get checkForUpdatesChecked(): boolean {
        return this.settings.checkForUpdates;
    }
    public set checkForUpdatesChecked(v: boolean) {
        this.settings.checkForUpdates = v;
    }

    public ngOnInit(): void {}
}
