import React from 'react';
import styles from '../styles/SideMenu.module.css';
import {Logo} from './ui/Logo.tsx'
import { SideMenuItem } from './SideMenuItem.tsx';
/* import { DocsSVG } from './ui/DocsSVG.tsx'; */
/* import { VisSVG } from './ui/VisSVG.tsx'; */
import { FinSVG } from './ui/FinSVG.tsx';
/* import { ManagSVG } from './ui/ManagSVG.tsx'; */
import { MarkSVG } from './ui/MarkSVG.tsx';
import { HelpSVG } from './ui/HelpSVG.tsx';
import { HomeSVG } from './ui/HomeSVG.tsx';
/* import { SetSVG } from './ui/SetSVG.tsx'; */

export const SideMenu: React.FC = () => {
    // Для меню
    const menuItems = [
        /* { label: "Документы", icon: <DocsSVG/>, path:"/docs" }, */
        /* { label: "Визуализация", icon: <VisSVG/>, path:"/visual" }, */
        { label: "Финансы", icon: <FinSVG/>, path:"/finance"  },
       /*  { label: "Управление", icon: <ManagSVG/>, path:"/management" },
        { label: "Компании", icon: <ManagSVG/>, path:"/cc" }, */
        { label: "Маркетинг", icon: <MarkSVG/>, path:"/marketing" },
        { label: "Помощник", icon: <HelpSVG/>, path:"/chat" },
        { label: "Главная", icon: <HomeSVG/>, path:"/home" },
        /* { label: "Настройки", icon: <SetSVG/>, path:"/settings" }, */
    ];

    return (
        <div className={styles.sideMenuWrapper}>
            <header className={styles.headerSection}>
                <Logo />
                <div className={styles.headerText}>
                    <p className={styles.titleText}>Vavilonus10</p> 
                    <p className={styles.subtitleText}>Copilot</p>
                </div>
            </header>

            <section className={styles.menuSection}>
                {menuItems.map((item, index) => (
                    <SideMenuItem 
                        key={index}
                        icon={item.icon}
                        label={item.label}
                        path={item.path}
                    />
                ))}
            </section>
        </div>
    );
};