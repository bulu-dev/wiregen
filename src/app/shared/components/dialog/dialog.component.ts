import { Component, inject, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../../core/services/dialog.service';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
    selector: 'app-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './dialog.component.html',
    styleUrl: './dialog.component.scss',
    animations: [
        trigger('backdrop', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('200ms ease-out', style({ opacity: 1 }))
            ]),
            transition(':leave', [
                animate('150ms ease-in', style({ opacity: 0 }))
            ])
        ]),
        trigger('modal', [
            transition(':enter', [
                style({ opacity: 0, transform: 'scale(0.95) translateY(10px)' }),
                animate('200ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
            ]),
            transition(':leave', [
                animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.95) translateY(10px)' }))
            ])
        ])
    ]
})
export class DialogComponent implements AfterViewChecked {
    dialog = inject(DialogService);
    promptValue = signal('');

    @ViewChild('promptInput') promptInput?: ElementRef<HTMLInputElement>;
    private wasOpen = false;

    ngAfterViewChecked() {
        const isOpen = this.dialog.state().isOpen;
        if (isOpen && !this.wasOpen) {
            this.promptValue.set(this.dialog.state().defaultValue || '');
            setTimeout(() => this.promptInput?.nativeElement.focus(), 100);
        }
        this.wasOpen = isOpen;
    }

    onConfirm() {
        if (this.dialog.state().type === 'prompt') {
            this.dialog.close(this.promptValue());
        } else {
            this.dialog.close(true);
        }
    }

    onCancel() {
        this.dialog.close(this.dialog.state().type === 'prompt' ? null : false);
    }

    onKeyDown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            this.onConfirm();
        } else if (event.key === 'Escape') {
            this.onCancel();
        }
    }
}
