import { html, ref, repeat, slotted, when, ViewTemplate } from "@microsoft/fast-element";
import { Carousel, tabPanelPrefix } from "./carousel";
import { FlipperDirection } from "../flipper";

const pauseIcon: string = `<svg viewBox="0 0 16 16" width="16px" height="16px" xmlns="http://www.w3.org/2000/svg"><path d="M13.9944 14.9875C13.9944 15.1284 13.9722 15.2582 13.9277 15.3769C13.8758 15.503 13.8016 15.6106 13.7051 15.6996C13.6161 15.7886 13.5086 15.8628 13.3825 15.9221C13.2638 15.974 13.1377 16 13.0042 16H11.0014C10.8679 16 10.7381 15.974 10.612 15.9221C10.4933 15.8628 10.3857 15.7886 10.2893 15.6996C10.2003 15.6106 10.1298 15.503 10.0779 15.3769C10.026 15.2582 10 15.1284 10 14.9875V1.00139C10 0.867872 10.026 0.738062 10.0779 0.611961C10.1298 0.493278 10.2003 0.38943 10.2893 0.300417C10.3857 0.203987 10.4933 0.12981 10.612 0.077886C10.7381 0.025962 10.8679 0 11.0014 0H13.0042C13.1377 0 13.2638 0.025962 13.3825 0.077886C13.5086 0.12981 13.6161 0.203987 13.7051 0.300417C13.8016 0.38943 13.8758 0.493278 13.9277 0.611961C13.9722 0.738062 13.9944 0.867872 13.9944 1.00139V14.9875ZM5.99444 14.9875C5.99444 15.1284 5.96847 15.2582 5.91655 15.3769C5.86463 15.503 5.79416 15.6106 5.70515 15.6996C5.61613 15.7886 5.50858 15.8628 5.38248 15.9221C5.26379 15.974 5.13398 16 4.99305 16H2.99026C2.84933 16 2.72323 15.974 2.61196 15.9221C2.49328 15.8628 2.38572 15.7886 2.28929 15.6996C2.20028 15.6106 2.12981 15.503 2.07789 15.3769C2.02596 15.2582 2 15.1284 2 14.9875V1.00139C2 0.867872 2.02596 0.738062 2.07789 0.611961C2.12981 0.493278 2.20028 0.38943 2.28929 0.300417C2.38572 0.203987 2.49328 0.12981 2.61196 0.077886C2.73064 0.025962 2.85675 0 2.99026 0H4.99305C5.13398 0 5.26379 0.025962 5.38248 0.077886C5.50858 0.12981 5.61613 0.203987 5.70515 0.300417C5.79416 0.38943 5.86463 0.493278 5.91655 0.611961C5.96847 0.738062 5.99444 0.867872 5.99444 1.00139V14.9875Z"></path></svg>`;

const playIcon: string = `<svg viewBox="0 0 16 16" width="16px" height="16px" xmlns="http://www.w3.org/2000/svg"><path d="M1 0V16L15.0083 8L1 0Z"></path></svg>`;

const tabbedTemplate: ViewTemplate = html<Carousel>`
    <fast-tabs
        class="carousel-tabs"
        activeindicator="false"
        activeid="${(x, c) => x.activeId}"
        notabfocus="${x => (!x.paused ? "true" : "false")}"
    >
        ${repeat(
            x => x.filteredItems,
            html<Carousel>`<span
                slot="tab"
                id="tab-${(x, c) => c.index + 1}"
                class="slide-tab"
            ></span>`,
            { positioning: true }
        )}
        ${x => html<Carousel>`
            ${x.filteredItems.map(
                (item: HTMLElement, index) =>
                    `<div slot="tabpanel" aria-hidden="true" id="${tabPanelPrefix}${
                        index + 1
                    }" class="slide-container" role="${
                        x.tabbed ? "tab-panel" : "group"
                    }" ${x.tabbed ? "" : "aria-roledescription='slide'"}
                    >
                        ${item.outerHTML}
                    </div>`
            )}
        `}
        ${/*
        // TODO: ASK This did not work as it interprets the outerHTML as a string and not as HTML. Should it work?
        repeat(
             x => x.filteredItems,
            html<Carousel>`<div
                    slot="tabpanel"
                    id="panel-${ (x, c) =>c.index + 1}"
                    class="slide-container"
                    role="${x => (x.tabbed ? "tab-panel" : "group")}"
                    aria-roledescription="${x => x.tabbed ? undefined : "slide" }"
                    >
                        ${ x => x.outerHTML}
                </div>`,
            { positioning: true }
        )
        */ ""}
    </fast-tabs>
`;

/**
 * The template for the {@link @microsoft/fast-foundation#(Carousel:class)} component.
 * @public
 */
export const CarouselTemplate = html<Carousel>`
<template ${ref("carousel")}>
    <div style="${x => (x.tabbed ? "display: none;" : "")}">
        <slot ${slotted("items")}></slot>
    </div>
    <div
        class="play-control"
        @click="${(x, c) => x.handlePlayClick(c.event)}"
    >
        <slot name="play-toggle" part="play-toggle">
            <fast-button appearance="neutral">
                ${x => (x.paused ? html`${playIcon}` : html`${pauseIcon}`)}
            </fast-button>
        </slot>
    </div>
    <div 
        class="previous-flipper flipper"
        @click="${(x, c) => x.handleFlipperClick(-1, c.event as MouseEvent)}"
        @keypress="${(x, c) => x.handleKeypress(-1, c.event as KeyboardEvent)}"
    >
        <slot name="previous-button" part="previous-button">
            <fast-flipper tabindex="${x => (x.tabbed ? "-1" : "0")}" direction=${
    FlipperDirection.previous
}>
        </slot>
    </div>

    ${when(x => x.tabbed, tabbedTemplate)}

    <div
        class="next-flipper flipper"
        @click="${(x, c) => x.handleFlipperClick(1, c.event as MouseEvent)}"
        @keypress="${(x, c) => x.handleKeypress(1, c.event as KeyboardEvent)}"
    >
        <slot name="next-button" part="next-button">
            <fast-flipper tabindex="${x => (x.tabbed ? "-1" : "0")}" direction=${
    FlipperDirection.next
}>
        </slot>
    </div>
</template>`;