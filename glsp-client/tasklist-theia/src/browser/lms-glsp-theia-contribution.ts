import { DiagramMenus } from '@eclipse-glsp/theia-integration';
import {
    CommandContribution,
    CommandRegistry,
    MenuContribution,
    MenuModelRegistry,
    MenuPath,
    MessageService
} from '@theia/core/lib/common';
import { inject, injectable } from 'inversify';

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
    @inject(MessageService)
    private readonly messageService: MessageService;

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(EnableAutolayoutCommand, {
            execute: () => this.messageService.info('GLSP Diagram autolayouting is enabled!')
        });
        registry.registerCommand(DisableAutolayoutCommand, {
            execute: () => this.messageService.info('GLSP Diagram autolayouting is disabled!')
        });
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
