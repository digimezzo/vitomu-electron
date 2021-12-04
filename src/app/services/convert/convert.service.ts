import { Injectable } from '@angular/core';
import * as path from 'path';
import { Observable, Subject } from 'rxjs';
import { AudioFormat } from '../../core/audio-format';
import { Constants } from '../../core/constants';
import { FileSystem } from '../../core/file-system';
import { Logger } from '../../core/logger';
import { Settings } from '../../core/settings';
import { Strings } from '../../core/Strings';
import { ConversionResult as ConversionResult } from './conversion-result';
import { DependencyChecker } from './dependency-checker';
import { DependencyCheckerFactory } from './dependency-checker-factory';
import { FFmpegDownloader } from './ffmpeg-downloader';
import { VideoConverter } from './video-converter';
import { VideoConverterFactory } from './video-converter.factory';
import { YoutubeDlDownloader } from './youtube-dl-downloader';
import { YoutubeDlUpdater } from './youtube-dl-updater';

@Injectable({
    providedIn: 'root',
})
export class ConvertService {
    private outputDirectory: string = path.join(this.fileSystem.musicDirectory(), 'Vitomu');
    private _lastConvertedFilePath: string = '';
    private _lastConvertedFileName: string = '';

    private conversionProgressChanged: Subject<number> = new Subject<number>();

    private _selectedAudioFormat: AudioFormat;
    private _selectedAudioBitrate: number;

    private ffmpegChecker: DependencyChecker = this.dependencyCheckerFactory.createFfmpegChecker();
    private youtubeDlChecker: DependencyChecker = this.dependencyCheckerFactory.createYoutubeDlChecker();

    constructor(
        private logger: Logger,
        private dependencyCheckerFactory: DependencyCheckerFactory,
        private ffmpegDownloader: FFmpegDownloader,
        private youtubeDlDownloader: YoutubeDlDownloader,
        private youtubeDlUpdater: YoutubeDlUpdater,
        private fileSystem: FileSystem,
        private settings: Settings,
        private videoConverterFactory: VideoConverterFactory
    ) {
        this._selectedAudioFormat = this.audioFormats.find((x) => x.id === this.settings.audioFormat);
        this._selectedAudioBitrate = this.audioBitrates.find((x) => x === this.settings.audioBitrate);
    }

    public audioFormats: AudioFormat[] = Constants.audioFormats;
    public audioBitrates: number[] = Constants.audioBitrates;

    public conversionProgressChanged$: Observable<number> = this.conversionProgressChanged.asObservable();

    public get lastConvertedFilePath(): string {
        return this._lastConvertedFilePath;
    }

    public set lastConvertedFilePath(v: string) {
        this._lastConvertedFilePath = v;
    }

    public get lastConvertedFileName(): string {
        return this._lastConvertedFileName;
    }

    public set lastConvertedFileName(v: string) {
        this._lastConvertedFileName = v;
    }

    public get selectedAudioFormat(): AudioFormat {
        return this._selectedAudioFormat;
    }

    public set selectedAudioFormat(v: AudioFormat) {
        this._selectedAudioFormat = v;
        this.settings.audioFormat = v.id;
    }

    public get selectedAudioBitrate(): number {
        return this._selectedAudioBitrate;
    }

    public set selectedAudioBitrate(v: number) {
        this._selectedAudioBitrate = v;
        this.settings.audioBitrate = v;
    }

    public onConversionProgressChanged(progressPercent: number): void {
        this.conversionProgressChanged.next(progressPercent);
    }

    public isVideoUrlConvertible(videoUrl: string): boolean {
        if (!Strings.isNullOrWhiteSpace(videoUrl)) {
            return Constants.youtubeLinks.some((x) => videoUrl.includes(x));
        }

        return false;
    }

    public async isFfmpegAvailableAsync(): Promise<boolean> {
        return await this.ffmpegChecker.isDependencyAvailableAsync();
    }

    public async isYoutubeDlAvailableAsync(): Promise<boolean> {
        return await this.youtubeDlChecker.isDependencyAvailableAsync();
    }

    public async downloadFfmpegAsync(): Promise<void> {
        if (!(await this.ffmpegChecker.isDependencyAvailableAsync())) {
            this.logger.info('Start downloading FFmpeg.', 'ConvertService', 'downloadFfmpegAsync');
            await this.ffmpegDownloader.downloadAsync(this.ffmpegChecker.downloadedDependencyFolder);
            this.logger.info('Finished downloading FFmpeg.', 'ConvertService', 'downloadFfmpegAsync');
        }
    }

    public async downloadYoutubeDlAsync(): Promise<void> {
        if (!(await this.youtubeDlChecker.isDependencyAvailableAsync())) {
            this.logger.info('Start downloading Youtube-dl.', 'ConvertService', 'downloadYoutubeDlAsync');
            await this.youtubeDlDownloader.downloadAsync(this.youtubeDlChecker.downloadedDependencyFolder);
            this.logger.info('Finished downloading Youtube-dl.', 'ConvertService', 'downloadYoutubeDlAsync');
        }
    }

    public updateYoutubeDl(): void {
        // We only updte Youtube-dl if it is our own
        if (!Strings.isNullOrWhiteSpace(this.youtubeDlChecker.getPathOfDownloadedDependency())) {
            this.logger.info('Start updating Youtube-dl.', 'ConvertService', 'updateYoutubeDlAsync');
            this.youtubeDlUpdater.updateYoutubeDl(this.youtubeDlChecker.getPathOfDownloadedDependency());
            this.logger.info('Finished updating Youtube-dl.', 'ConvertService', 'updateYoutubeDlAsync');
        }
    }

    public async convertAsync(videoUrl: string): Promise<ConversionResult> {
        await this.fileSystem.ensureDirectoryAsync(this.outputDirectory);

        let ffmpegPathOverride: string = '';

        if (!(await this.ffmpegChecker.isDependencyInSystemPathAsync())) {
            ffmpegPathOverride = this.ffmpegChecker.getPathOfDownloadedDependency();
        }

        let youtubeDlPathOverride: string = '';

        if (!(await this.youtubeDlChecker.isDependencyInSystemPathAsync())) {
            youtubeDlPathOverride = this.youtubeDlChecker.getPathOfDownloadedDependency();
        }

        const videoConverter: VideoConverter = this.videoConverterFactory.create(videoUrl);

        const conversionResult: ConversionResult = await videoConverter.convertAsync(
            videoUrl,
            this.outputDirectory,
            this.selectedAudioFormat,
            this.selectedAudioBitrate,
            ffmpegPathOverride,
            youtubeDlPathOverride,
            (progressPercent) => this.onConversionProgressChanged(progressPercent)
        );

        if (conversionResult.isConversionSuccessful) {
            this.lastConvertedFilePath = conversionResult.convertedFilePath;
            this.lastConvertedFileName = this.fileSystem.getFileName(conversionResult.convertedFilePath);
        }

        return conversionResult;
    }
}
