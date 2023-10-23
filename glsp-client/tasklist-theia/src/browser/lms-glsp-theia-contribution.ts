import { DiagramCommandHandler, DiagramMenus } from '@eclipse-glsp/theia-integration';
import { ApplicationShell } from '@theia/core/lib/browser';
import { CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry, MenuPath } from '@theia/core/lib/common';
import { inject, injectable } from 'inversify';
import { Action } from 'sprotty-protocol';

export const EnableAutolayoutCommand = {
    id: 'glsp:lms:autolayout:enable',
    label: 'Enable GLSP diagram autolayouting'
};

export const DisableAutolayoutCommand = {
    id: 'glsp:lms:autolayout:disable',
    label: 'Disable GLSP diagram autolayouting'
};

export namespace AutolayoutMenus {
    export const AUTOLAYOUT: MenuPath = DiagramMenus.DIAGRAM.concat('z_autolayout');
}

@injectable()
export class LmsGlspContribution implements CommandContribution {
    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(
            EnableAutolayoutCommand,
            new DiagramCommandHandler(this.shell, widget => widget.actionDispatcher.dispatch(AutolayoutConfigAction.create(true)))
        );
        registry.registerCommand(
            DisableAutolayoutCommand,
            new DiagramCommandHandler(this.shell, widget => widget.actionDispatcher.dispatch(AutolayoutConfigAction.create(false)))
        );
    }
}

@injectable()
export class LmsGlspMenuContribution implements MenuContribution {
    registerMenus(menus: MenuModelRegistry): void {
        menus.registerSubmenu(AutolayoutMenus.AUTOLAYOUT, 'Autolayout');
        menus.registerMenuAction(AutolayoutMenus.AUTOLAYOUT, {
            commandId: EnableAutolayoutCommand.id,
            label: 'Enable'
        });
        menus.registerMenuAction(AutolayoutMenus.AUTOLAYOUT, {
            commandId: DisableAutolayoutCommand.id,
            label: 'Disable'
        });
    }
}

// TODO: Remove duplicates (action declared in glsp-server)
export interface AutolayoutConfigAction extends Action {
    kind: typeof AutolayoutConfigAction.KIND;
    enable: boolean;
}
export namespace AutolayoutConfigAction {
    export const KIND = 'autolayout-config';

    export function create(enable: boolean): AutolayoutConfigAction {
        return {
            kind: KIND,
            enable
        };
    }
}
