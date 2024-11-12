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
    const bkupButton = document.querySelector('#bkup');
    const novoButton = document.querySelector('#novo');
    const fixDataButton = document.querySelector('#dataConverter');
    const hideCheckbox = document.querySelector('#hideextra');

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
    bkupButton.addEventListener('click', function (event) {
        backupCsv();
    });
    novoButton.addEventListener('click', function (event) {
        if (table){
            addRow();
        }
    });
    fixDataButton.addEventListener('click', function (event) {
        fixDataTable();
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

    function translateHeadings(headings) {
        let dict = {
            Name: "Nome",
            PCod: "#",
            BirthDate: "Data de Nascimento",
            Address: "Endereço",
            Phone: "Telefone",
            cel: "Celular",
            City: "Cidade",
            State: "Estado",
            Occupation: "Profissão",
            Mother: "Mãe",
            Father: "Pai",
            District: "Bairro",
            CivilStatus: "Estado Civil",
            Sex: "Sexo",

        }
        for (index in headings){
            if (headings[index] in dict){
                headings[index] = dict[headings[index]]
            }
        }
    }

    function getIndexesToHide(){
        let filters = [];
        let toHide = ["Endereço", "Estado", "Profissão", "Mãe", "Pai", "Bairro", "Estado Civil", "EMail"]
        table.data.headings.forEach((element, index) => {
            if (toHide.includes(element.data)){
                filters.push(index);
            }
        });
        return filters;
    }

    function hideExtraColumns(){
        let indexes = getIndexesToHide();
        indexes.forEach(index => table.columns.settings[index].hidden=true)
        table.refresh();
        editor.options.excludeColumns=indexes.concat([0]);
    }

    function showExtraColumns(){
        table.columns.settings.forEach(x=>x.hidden=false);
        table.refresh();
        editor.options.excludeColumns=[0]
    }

    function handleHideButton(){
        let hide = hideCheckbox.checked;
        if (hide){
            hideExtraColumns();
        }
        else{
            showExtraColumns();
        }
    }
    hideCheckbox.addEventListener('change', handleHideButton);


    // Creates a new table
    function loadCSVOntoTable(data) {
        let csv = simpleDatatables.convertCSV({ data: data, columnDelimiter: "%%", headings: true })
        if (csv.data[csv.data.length - 1].length == 1) {
            csv.data.pop();
        }
        translateHeadings(csv.headings);

        resetTable();
        table = new simpleDatatables.DataTable("#table", {
            data: csv,
            fixedColumns: false, //To make things faster on resize
            perPage: 30,
            perPageSelect: [10, 20, 30, 50, 100],
            format: "DD/MM/YYYY",
            type: "html",
            ignorePunctuation: false,
            template: getTemplate(),
            columns: [
                {select: 0,
                    type: "number",
                    sort: "desc"},

            ]

        })
        table.multiSearch = debounce(table.multiSearch, 500);
        table.data.data.forEach(row=> row.cells[2].order = dateToOrder(row.cells[2].text))
        createEditor();
        handleHideButton();
    }

    // function exportJson() {
    //     simpleDatatables.exportJson(table, "myname.json")
    // }

    function exportCsv() {
        downloadString(generateCSV(), "pacientes.csv");
    }

    function backupCsv() {
        let currentDate = new Date().toJSON().slice(0, 10);
        downloadString(generateCSV(), "backup-pacientes-"+ currentDate +".csv");
    }

        
    function addRow(){
        let newRowData= Array(table.data.headings.length).fill("");
        editor.editing = editor.editingRow=true;
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
                    text: "<span class='mdi mdi-lead-pencil'></span> Editar Linha",
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
                editCell: "Editar",
                editRow: "Editar paciente",
                removeRow: "Remover",
                reallyRemove: "Voce tem certeza",
                reallyCancel: "Voce realmente quer cancelar?",
                save: "Salvar",
                cancel: "Cancelar"
            },
        })

        table.on("editable.save.cell", (newValue, oldValue, row, column) => {
            console.log(`cell is saved: newValue=${newValue}, oldValue=${oldValue}, row=${row}, column=${column}`)
            exportCsv();
        })
        table.on("editable.save.row", (newValue, oldValue, row) => {
            console.log(`cell is saved: newValue=${newValue}, oldValue=${oldValue}, row=${row}`)
            let rowIndex = table.data.data['length']-1;
            let r = table.data.data[rowIndex]; 
            r.cells[2].order = dateToOrder(r.cells[2].text)
            resort();
            exportCsv();
        })
    }

    function generateCSV(){
        let headings = table.data.headings.map(cell=>cell.data).join("%%");
        let csv= table.data.data.map(row => row.cells.map(x=>x.text).join("%%")).join("\r\n")
        csv = [headings, csv].join("\n");
        return csv;
    }

    function resort(){
        if (table.columns._state.sort) {
            table.columns.sort(table.columns._state.sort.column, table.columns._state.sort.dir, true)
        }
        table.update(true);
    }

    function fixDate(d){
        if(!/^\d{4}\-\d{2}\-\d{2}[ ]?$/.test(d)){
            return d;
        }
        else{
            return d.slice(8,10)+"/"+d.slice(5,7)+"/"+d.slice(0,4)
        }
    }

    function dateToOrder(d){
        if(!/^\d{2}\/\d{2}\/\d{4}[ ]?$/.test(d)){
            return d;
        }
        else{
            return d.slice(6,10)+d.slice(3,5)+d.slice(0,2)
        }
    }

    function generateCSVFixedData(){
        let headings = table.data.headings.map(cell=>cell.data).join("%%");
        let dateIndex = 2;
        let csv= table.data.data.map((row, index) => 
            row.cells.map((x, index)=> {
                if (index == dateIndex){
                    return fixDate(x.text);
                }
                else{
                    return x.text;
                }
            }
            ).join("%%")
        ).join("\r\n")
        csv = [headings, csv].join("\n");
        return csv;
    }

    function fixDataTable(){
        if (confirm("Converter datas 1999-01-31 to 31/01/1999?")) {
            let csv = generateCSVFixedData();
            loadCSVOntoTable(csv);
        }
    }

    async function downloadString(inputString, name) {
        let blob = new Blob([inputString], { type: 'text/csv' }); // ! Blob

        let elemx = window.document.createElement('a');
        elemx.href = window.URL.createObjectURL(blob); // ! createObjectURL
        elemx.download = name;
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