// Global variables
var table;
var editor;

//utils:
function debounce(func, wait) {
    let timeout;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

function getMaxPcod(){
    if(!table){
        return
    }
    else{
        let row = table.data.data.reduce((prev, current) => (prev && parseInt(prev.cells[0].text) > parseInt(current.cells[0].text)) ? prev : current)
        return parseInt(row.cells[0].text)
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const importButton = document.querySelector('#import');
    const exportButton = document.querySelector('#export');

    importButton.addEventListener('change', function (event) {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = function (event) {
            // NOTE: event.target point to FileReader
            var contents = event.target.result;
            let data = contents;
            loadCSVOntoTable(data);
            importButton.value = '';
        };

        reader.readAsText(file);
    });
    exportButton.addEventListener('click', function (event) {
        exportCsv();
    });



    function getTemplate() {
        let template = (options, dom) => `<div class='${options.classes.top}'>
                    <div class='${options.classes.dropdown}'>
                        <label>
                            <select class='${options.classes.selector}'></select> ${options.labels.perPage}
                        </label>
                    </div>
                    <div class='${options.classes.search}'>
                        <input class='${options.classes.input}' placeholder='Pesquisar' type='search' data-and="true" title='${options.labels.searchTitle}'${dom.id ? ` aria-controls="${dom.id}"` : ""}>
                    </div>
                    </div>
                    <div class='${options.classes.container}'${options.scrollY.length ? ` style='height: ${options.scrollY}; overflow-Y: auto;'` : ""}></div>
                    <div class='${options.classes.bottom}'>
                    <div class='${options.classes.info}'></div>
                    <nav class='${options.classes.pagination}'></nav>
                </div>`
        return template;
    }


    // Creates a new table
    function loadJsonOntoTable(json) {
        table = new simpleDatatables.DataTable("#table", {
            data: {
                headings: getHeadingsFromJson(json),
                data: json
            },
            fixedColumns: false, //To make things faster on resize
            template: getTemplate()

        })
        table.multiSearch = debounce(table.multiSearch, 300);
    }

    function resetTable() {
        if (table) { table.destroy(); }
        if (editor) { editor.destroy(); }
    }

    // Creates a new table
    function loadCSVOntoTable(data) {
        let csv = simpleDatatables.convertCSV({ data: data, columnDelimiter: "%%", headings: true })
        if (csv.data[csv.data.length - 1].length == 1) {
            csv.data.pop();
        }
        let headings = csv
        // console.log(data);
        resetTable();
        table = new simpleDatatables.DataTable("#table", {
            data: csv,
            fixedColumns: false, //To make things faster on resize
            template: getTemplate()

        })
        table.multiSearch = debounce(table.multiSearch, 500);
        createEditor();
    }

    // function exportJson() {
    //     simpleDatatables.exportJson(table, "myname.json")
    // }

    function exportCsv() {
        downloadString(generateCSV());
    }

        
    function addRow(){
        let newRowData= Array(table.data.headings.length).fill("");
        editor.editing=true;
        newRowData[0] = getMaxPcod()+1;
        table.rows.add(newRowData)
        let rowIndex = table.data.data['length']-1;
        editor.data.row = table.data.data[rowIndex].cells; 
        editor.data.rowIndex = rowIndex;
        editor.editRowModal();
    }

    function createEditor() {
        editor = simpleDatatables.makeEditable(table, {
            contextMenu: true,
            hiddenColumns: true,
            excludeColumns: [0], // make the "Ext." column non-editable
            inline: false,
            cancelModal: t=>true,
            menuItems: [
                {
                    text: "<span class='mdi mdi-lead-pencil'></span> Editar Valor",
                    action: (editor, _event) => {
                        const td = editor.event.target.closest("td")
                        return editor.editCell(td)
                    }
                }, {
                    text: "<span class='mdi mdi-lead-pencil'></span> Edit Linha",
                    action: (editor, _event) => {
                        const tr = editor.event.target.closest("tr")
                        return editor.editRow(tr)
                    }
                }, {
                    text: "<span class='mdi mdi-lead-pencil'></span> Adicionar Linha",
                    action: (editor, _event) => {
                        const tr = editor.event.target.closest("tr")
                        return addRow()
                    }

                }, {
                    separator: true
                }, {
                    text: "<span class='mdi mdi-delete'></span> Remover Linha",
                    action: (editor, _event) => {
                        if (confirm("Você tem certeza que quer remover essa linha?")) {
                            const tr = editor.event.target.closest("tr")
                            editor.removeRow(tr)
                        }
                    }
                }
            ],
            labels: {
                closeX: "x",
                editCell: "Edit Cell",
                editRow: "Edit Row",
                removeRow: "Remove Row",
                reallyRemove: "Are you sure?",
                reallyCancel: "Do you really want to cancel?",
                save: "Save",
                cancel: "Cancel"
            },
        })

        table.on("editable.save.cell", (newValue, oldValue, row, column) => {
            console.log(`cell is saved: newValue=${newValue}, oldValue=${oldValue}, row=${row}, column=${column}`)
            exportCsv();
        })
        table.on("editable.save.row", (newValue, oldValue, row) => {
            console.log(`cell is saved: newValue=${newValue}, oldValue=${oldValue}, row=${row}`)
            exportCsv();
        })
    }

    function generateCSV(){
        let headings = table.data.headings.map(cell=>cell.data).join("%%");
        let csv= table.data.data.map(row => row.cells.map(x=>x.text).join("%%")).join("\r\n")
        csv = [headings, csv].join("\n");
        return csv;

    }
    async function downloadString(inputString) {
        let blob = new Blob([inputString], { type: 'text/plain' }); // ! Blob

        let elemx = window.document.createElement('a');
        elemx.href = window.URL.createObjectURL(blob); // ! createObjectURL
        elemx.download = "pacientes.csv";
        elemx.style.display = 'none';
        document.body.appendChild(elemx);
        elemx.click();
        document.body.removeChild(elemx);
      }
      
    async function saveFile(string) {
        // create a new handle
        const newHandle = await window.showSaveFilePicker();
      
        // create a FileSystemWritableFileStream to write to
        const writableStream = await newHandle.createWritable();
      
        // write our file
        await writableStream.write(string);
      
        // close the file and write the contents to disk.
        await writableStream.close();
      }

    f = exportCsv;
    g=generateCSV;
})
var f;
var g;