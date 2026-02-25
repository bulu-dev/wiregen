import { Injectable, signal } from '@angular/core';

export type DialogType = 'confirm' | 'prompt';

interface DialogState {
    isOpen: boolean;
    title: string;
    message: string;
    type: DialogType;
    defaultValue?: string;
    isDanger?: boolean;
    resolve?: (value: any) => void;
}

@Injectable({
    providedIn: 'root'
})
export class DialogService {
    state = signal<DialogState>({
        isOpen: false,
        title: '',
        message: '',
        type: 'confirm'
    });

    confirm(title: string, message: string, isDanger: boolean = false): Promise<boolean> {
        return new Promise((resolve) => {
            this.state.set({
                isOpen: true,
                title,
                message,
                type: 'confirm',
                isDanger,
                resolve
            });
        });
    }

    prompt(title: string, message: string, defaultValue: string = ''): Promise<string | null> {
        return new Promise((resolve) => {
            this.state.set({
                isOpen: true,
                title,
                message,
                type: 'prompt',
                defaultValue,
                resolve
            });
        });
    }

    close(result: any) {
        const current = this.state();
        if (current.resolve) {
            current.resolve(result);
        }
        this.state.set({ ...current, isOpen: false, resolve: undefined });
    }
}
