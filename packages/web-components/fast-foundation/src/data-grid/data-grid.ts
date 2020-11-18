import {
    attr,
    DOM,
    FASTElement,
    html,
    RepeatBehavior,
    RepeatDirective,
    observable,
    ViewTemplate,
} from "@microsoft/fast-element";
import {
    keyCodeArrowDown,
    keyCodeArrowUp,
    keyCodeEnd,
    keyCodeHome,
    keyCodePageDown,
    keyCodePageUp,
} from "@microsoft/fast-web-utilities";
import { DataGridCell } from "./data-grid-cell";
import { DataGridRow, DataGridRowTypes } from "./data-grid-row";

/**
 * Defines a column in the grid
 *
 * @public
 */
export interface ColumnDefinition {
    /**
     * Identifies the data item to be displayed in this column
     * (i.e. how the data item is labelled in each row)
     */
    columnDataKey: string;

    /**
     * Sets the css grid-column property on the cell which controls its placement in
     * the parent row. If left unset the cells will set this value to match the index
     * of their column in the parent collection of ColumnDefinitions.
     */
    gridColumn?: string;

    /**
     *  Column title, if not provided columnDataKey is used as title
     */
    title?: string;

    /**
     *  Header cell template
     */
    headerCellTemplate?: ViewTemplate;

    /**
     * Whether the header cell has an internal focus queue
     */
    headerCellInternalFocusQueue?: boolean;

    /**
     * Callback function that returns the element to focus in a custom cell.
     * When headerCellInternalFocusQueue is false this function is called when the cell is first focused
     * to immediately move focus to a cell element, for example a cell that is a checkbox could move
     * focus directly to the checkbox.
     * When headerCellInternalFocusQueue is true this function is called when the user hits Enter or F2
     */
    headerCellFocusTargetCallback?: (cell: DataGridCell) => HTMLElement;

    /**
     * cell template
     */
    cellTemplate?: ViewTemplate;

    /**
     * Whether the cell has an internal focus queue
     */
    cellInternalFocusQueue?: boolean;

    /**
     * Callback function that returns the element to focus in a custom cell.
     * When cellInternalFocusQueue is false this function is called when the cell is first focused
     * to immediately move focus to a cell element, for example a cell that is a checkbox could move
     * focus directly to the checkbox.
     * When cellInternalFocusQueue is true this function is called when the user hits Enter or F2
     */

    cellFocusTargetCallback?: (cell: DataGridCell) => HTMLElement;
}

const defaultRowItemTemplate = html`
    <fast-data-grid-row
        :rowData="${x => x}"
        :cellItemTemplate="${(x, c) => c.parent.cellItemTemplate}"
        :headerCellItemTemplate="${(x, c) => c.parent.headerCellItemTemplate}"
    ></fast-data-grid-row>
`;

/**
 * Enumerates auto generated header options
 * default option generates a non-sticky header row
 *
 * @public
 */
export enum GenerateHeaderOptions {
    none = "none",
    default = "default",
    sticky = "sticky",
}

/**
 * A Data Grid Custom HTML Element.
 *
 * @public
 */
export class DataGrid extends FASTElement {
    /**
     *  generates a basic column definition by examining sample row data
     */
    public static generateColumns = (row: object): ColumnDefinition[] => {
        const definitions: ColumnDefinition[] = [];
        const properties: string[] = Object.getOwnPropertyNames(row);
        properties.forEach((property: string, index: number) => {
            definitions.push({
                columnDataKey: property,
                gridColumn: `${index}`,
            });
        });
        return definitions;
    };

    /**
     *  generates a gridTemplateColumns based on columndata array
     */
    private static generateTemplateColumns(
        columnDefinitions: ColumnDefinition[]
    ): string {
        let templateColumns: string = "";
        columnDefinitions.forEach((column: ColumnDefinition) => {
            templateColumns = `${templateColumns}${
                templateColumns === "" ? "" : " "
            }${"1fr"}`;
        });
        return templateColumns;
    }

    /**
     *  Whether the grid should automatically generate a header row and its type
     *
     * @public
     * @remarks
     * HTML Attribute: generate-header
     */
    @attr({ attribute: "generate-header" })
    public generateHeader: GenerateHeaderOptions = GenerateHeaderOptions.default;
    private generateHeaderChanged(): void {
        if ((this as FASTElement).$fastController.isConnected) {
            this.toggleGeneratedHeader();
        }
    }

    /**
     * String that gets applied to the the css gridTemplateColumns attribute of child rows
     *
     * @public
     * @remarks
     * HTML Attribute: grid-template-columns
     */
    @attr({ attribute: "grid-template-columns" })
    public gridTemplateColumns: string;
    private gridTemplateColumnsChanged(): void {
        if ((this as FASTElement).$fastController.isConnected) {
            this.updateRowIndexes();
        }
    }

    /**
     * The data being displayed in the grid
     *
     * @public
     */
    @observable
    public rowsData: object[] = [];
    private rowsDataChanged(): void {
        if (this.columnDefinitions === null && this.rowsData.length > 0) {
            this.columnDefinitions = DataGrid.generateColumns(this.rowsData[0]);
        }
    }

    /**
     * The column definitions of the grid
     *
     * @public
     */
    @observable
    public columnDefinitions: ColumnDefinition[] | null = null;
    private columnDefinitionsChanged(): void {
        if (this.columnDefinitions === null) {
            this.generatedGridTemplateColumns = "";
            return;
        }
        this.generatedGridTemplateColumns = DataGrid.generateTemplateColumns(
            this.columnDefinitions
        );
        if ((this as FASTElement).$fastController.isConnected) {
            this.columnDefinitionsStale = true;
            this.queueRowIndexUpdate();
        }
    }

    /**
     * The template to use for the programmatic generation of rows
     *
     * @public
     */
    @observable
    public rowItemTemplate: ViewTemplate = defaultRowItemTemplate;

    /**
     * The template used to render cells in generated rows.
     *
     * @public
     */
    @observable
    public cellItemTemplate?: ViewTemplate;

    /**
     * The template used to render header cells in generated rows.
     *
     * @public
     */
    @observable
    public headerCellItemTemplate?: ViewTemplate;
    private headerCellItemTemplateChanged(): void {
        if ((this as FASTElement).$fastController.isConnected) {
            if (this.generatedHeader !== null) {
                this.generatedHeader.headerCellItemTemplate = this.headerCellItemTemplate;
            }
        }
    }

    /**
     * The index of the row that will receive focus the next time the
     * grid is focused. This value changes as focus moves to different
     * rows within the grid.  Changing this value when focus is already
     * within the grid moves focus to the specified row.
     *
     * @public
     */
    @observable
    public focusRowIndex: number = 0;
    private focusRowIndexChanged(): void {
        if ((this as FASTElement).$fastController.isConnected) {
            this.queueFocusUpdate();
        }
    }

    /**
     * The index of the column that will receive focus the next time the
     * grid is focused. This value changes as focus moves to different rows
     * within the grid.  Changing this value when focus is already within
     * the grid moves focus to the specified column.
     *
     * @public
     */
    @observable
    public focusColumnIndex: number = 0;
    private focusColumnIndexChanged(): void {
        if ((this as FASTElement).$fastController.isConnected) {
            this.queueFocusUpdate();
        }
    }

    private rowsRepeatBehavior: RepeatBehavior | null;
    private rowsPlaceholder: Node | null = null;

    private generatedHeader: DataGridRow | null = null;

    private isUpdatingFocus: boolean = false;
    private pendingFocusUpdate: boolean = false;

    private observer: MutationObserver;

    private rowindexUpdateQueued: boolean = false;
    private columnDefinitionsStale: boolean = true;

    private generatedGridTemplateColumns: string = "";

    constructor() {
        super();
    }

    /**
     * @internal
     */
    public connectedCallback(): void {
        super.connectedCallback();

        this.rowsPlaceholder = document.createComment("");
        this.appendChild(this.rowsPlaceholder);

        this.toggleGeneratedHeader();

        this.rowsRepeatBehavior = new RepeatDirective(
            x => x.rowsData,
            x => x.rowItemTemplate,
            { positioning: true }
        ).createBehavior(this.rowsPlaceholder);

        this.$fastController.addBehaviors([this.rowsRepeatBehavior!]);

        this.addEventListener("row-focused", this.handleRowFocus);
        this.addEventListener("focus", this.handleFocus);
        this.addEventListener("keydown", this.handleKeydown);

        this.observer = new MutationObserver(this.onChildListChange);
        // only observe if nodes are added or removed
        this.observer.observe(this as Element, { childList: true });

        DOM.queueUpdate(this.queueRowIndexUpdate);
    }

    /**
     * @internal
     */
    public disconnectedCallback(): void {
        super.disconnectedCallback();

        this.removeEventListener("row-focused", this.handleRowFocus);
        this.removeEventListener("focus", this.handleFocus);
        this.removeEventListener("keydown", this.handleKeydown);

        // disconnect observer
        this.observer.disconnect();

        this.rowsPlaceholder = null;
        this.generatedHeader = null;
    }

    /**
     * @internal
     */
    public handleRowFocus(e: Event): void {
        this.isUpdatingFocus = true;
        const focusRow: DataGridRow = e.target as DataGridRow;
        const rows: Element[] = Array.from(this.querySelectorAll('[role="row"]'));
        this.focusRowIndex = rows.indexOf(e.target as Element);
        this.focusColumnIndex = focusRow.focusColumnIndex;
        this.isUpdatingFocus = false;
    }

    /**
     * @internal
     */
    public handleFocus(e: FocusEvent): void {
        this.focusOnCell(this.focusRowIndex, this.focusColumnIndex);
    }

    /**
     * @internal
     */
    public handleKeydown(e: KeyboardEvent): void {
        if (e.defaultPrevented) {
            return;
        }
        switch (e.keyCode) {
            case keyCodeArrowUp:
                // focus up one row
                this.focusOnCell(this.focusRowIndex - 1, this.focusColumnIndex);
                e.preventDefault();
                break;

            case keyCodeArrowDown:
                // focus down one row
                this.focusOnCell(this.focusRowIndex + 1, this.focusColumnIndex);
                e.preventDefault();
                break;

            case keyCodePageUp:
                // TODO: focus up one "page"
                e.preventDefault();
                break;

            case keyCodePageDown:
                //TODO: focus down one "page"
                e.preventDefault();
                break;

            case keyCodeHome:
                if (e.ctrlKey) {
                    // focus first cell of first row
                    this.focusOnCell(0, 0);
                    e.preventDefault();
                }
                break;
            case keyCodeEnd:
                if (e.ctrlKey && this.columnDefinitions !== null) {
                    // focus last cell of last row
                    const rows: NodeListOf<Element> = this.querySelectorAll(
                        '[role="row"]'
                    );
                    this.focusOnCell(
                        rows.length - 1,
                        this.columnDefinitions.length - 1,
                        rows
                    );
                    e.preventDefault();
                }
                break;
        }
    }

    private focusOnCell = (
        rowIndex: number,
        columnIndex: number,
        rows?: NodeListOf<Element>
    ): void => {
        if (rows === undefined) {
            rows = this.querySelectorAll('[role="row"]');
        }

        if (
            rows.length === 0 ||
            this.columnDefinitions === null ||
            this.columnDefinitions.length === 0
        ) {
            this.focusRowIndex = 0;
            this.focusColumnIndex = 0;
            return;
        }

        let focusRowIndex = Math.max(0, Math.min(rows.length - 1, rowIndex));
        const focusRow: Element = rows[focusRowIndex];

        const cells: NodeListOf<Element> = focusRow.querySelectorAll(
            '[role="cell"], [role="gridcell"], [role="columnheader"]'
        );

        let focusColumnIndex = Math.max(0, Math.min(cells.length - 1, columnIndex));

        (cells[focusColumnIndex] as HTMLElement).focus();

        // try to center focused row so it isn't hidden by a sticky header
        (cells[focusColumnIndex] as HTMLElement).scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
        });
    };

    private queueFocusUpdate(): void {
        if (
            this.isUpdatingFocus &&
            (this.contains(document.activeElement) || this === document.activeElement)
        ) {
            return;
        }
        if (this.pendingFocusUpdate === false) {
            this.pendingFocusUpdate = true;
            DOM.queueUpdate(this.updateFocus);
        }
    }

    private updateFocus(): void {
        this.pendingFocusUpdate = false;
        this.focusOnCell(this.focusRowIndex, this.focusColumnIndex);
    }

    private toggleGeneratedHeader(): void {
        if (this.generatedHeader !== null) {
            this.removeChild(this.generatedHeader);
            this.generatedHeader = null;
        }

        if (this.generateHeader !== GenerateHeaderOptions.none) {
            const generatedHeaderElement: HTMLElement = document.createElement(
                "fast-data-grid-row"
            );
            this.generatedHeader = (generatedHeaderElement as unknown) as DataGridRow;
            this.generatedHeader.columnDefinitions = this.columnDefinitions;
            this.generatedHeader.gridTemplateColumns = this.gridTemplateColumns;
            this.generatedHeader.rowType =
                this.generateHeader === GenerateHeaderOptions.sticky
                    ? DataGridRowTypes.stickyHeader
                    : DataGridRowTypes.header;
            if (this.firstChild !== null || this.rowsPlaceholder !== null) {
                this.insertBefore(
                    generatedHeaderElement,
                    this.firstChild !== null ? this.firstChild : this.rowsPlaceholder
                );
            }
            return;
        }
    }

    private onChildListChange = (
        mutations: MutationRecord[],
        /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
        observer: MutationObserver
    ): void => {
        if (mutations!.length) {
            mutations.forEach((mutation: MutationRecord): void => {
                mutation.addedNodes.forEach((newNode: Node): void => {
                    if (
                        newNode.nodeType === 1 &&
                        (newNode as Element).getAttribute("role") === "row"
                    ) {
                        (newNode as DataGridRow).columnDefinitions = this.columnDefinitions;
                    }
                });
            });

            this.queueRowIndexUpdate();
        }
    };

    private queueRowIndexUpdate = (): void => {
        if (!this.rowindexUpdateQueued) {
            this.rowindexUpdateQueued = true;
            DOM.queueUpdate(this.updateRowIndexes);
        }
    };

    private updateRowIndexes = (): void => {
        const rows: NodeListOf<Element> = this.querySelectorAll('[role="row"]');

        const newGridTemplateColumns =
            this.gridTemplateColumns === undefined
                ? this.generatedGridTemplateColumns
                : this.gridTemplateColumns;

        rows.forEach((element: Element, index: number): void => {
            const thisRow = element as DataGridRow;
            thisRow.rowIndex = index;
            thisRow.gridTemplateColumns = newGridTemplateColumns;
            if (this.columnDefinitionsStale) {
                thisRow.columnDefinitions = this.columnDefinitions;
            }
        });

        this.rowindexUpdateQueued = false;
        this.columnDefinitionsStale = false;
    };
}
