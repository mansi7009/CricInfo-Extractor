// description ---> the purpose of this project is to extract information of worldcup 2019 from cricinfo and present
//  that in the form of excel and pdf scorecards
// the real purpose is to learn how to extract information and get experience with js
// A very good reason to ever make a project is to have good fun

// npm init -y
// npm install minimist
// npm install jsdom
// npm install excel4node
// npm install axios
// npm install pdf-lib

// node Project1.js --url=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results --dataFolder=worldCup --excelFile=data.csv

// download and process the html from web
// convert web to json 
// write it in excel file
// create folders with team json 
// convert it into pdfs

let minimist = require("minimist");
let path = require('path');
let axios = require("axios");       
let pdf = require("pdf-lib");
let jsdom = require("jsdom");
let fs = require('fs');
let xls = require('excel4node');
let args = minimist(process.argv);


// processing html and creating matches json from it

let dwldKaPromise = axios.get(args.url);
dwldKaPromise.then(function (response) {
    let html = response.data;
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;

    let matches = [];
    let matchDivs = document.querySelectorAll('div.match-score-block');


    for (let i = 0; i < matchDivs.length; i++) {
        let match = {
            t1: "",
            t2: "",
            t1s: "",
            t2s: "",
            target:"",
            result: "",
            description: ""
        }

        let teamNames = matchDivs[i].querySelectorAll('div.name-detail > p');
        match.t1 = teamNames[0].textContent;
        match.t2 = teamNames[1].textContent;

        let ScoreSpan = matchDivs[i].querySelectorAll('div.score-detail > span.score');
        let targetSpan = matchDivs[i].querySelector('div.match-info > span.score-info');
        // if(targetSpan != null){
        //     console.log(targetSpan.textContent);
        // }
        if (ScoreSpan.length == 2) {
            match.t1s = ScoreSpan[0].textContent;
            match.t2s = ScoreSpan[1].textContent;
            match.target =  targetSpan.textContent;  // team2 ka target h yha p
        } else if (ScoreSpan.length == 1) {
            match.t1s = ScoreSpan[0].textContent;
            match.t2s = "";
            // match.target = ""; 
            match.target = targetSpan.textContent; 
        } else {
            match.t1s = "";
            match.t2s = "";   
            // match.target = ""; //no as such target 
        }

        let descriptionDiv = matchDivs[i].querySelector('div.match-info  > div.description');
        match.description = descriptionDiv.textContent;
        let resultSpan = matchDivs[i].querySelector(' div.status-text > span');
        match.result = resultSpan.textContent;
        matches.push(match);
    }
    // console.log(matches);
    let matchesKaJson = JSON.stringify(matches);
    fs.writeFileSync("matches.json", matchesKaJson, "utf-8");

    let teams = [];
    for (let i = 0; i < matches.length; i++) {
        addTeamToTeamsArrayIfMissing(teams, matches[i].t1);
        addTeamToTeamsArrayIfMissing(teams, matches[i].t2);
    }

    for (let i = 0; i < matches.length; i++) {
        addMatchToSpecificTeam(teams, matches[i].t1, matches[i].t2, matches[i].t1s, matches[i].t2s, matches[i].result, matches[i].description);
        addMatchToSpecificTeam(teams, matches[i].t2, matches[i].t1, matches[i].t2s, matches[i].t1s, matches[i].result, matches[i].description);
    }
    let teamsKaJson = JSON.stringify(teams);
    fs.writeFileSync("teams.json", teamsKaJson, "utf-8");

    createFolders(teams);
    createExcelFile(teams);


});

function createExcelFile(teams){

    let wb = new xls.Workbook();
    let style = wb.createStyle({
        font:{
            color:"white",
        },
        fill:
        {
            type:"pattern",
            patternType:"solid",
            fgcolor:"black"
        },
        border:{
            left:{
                style: "thick",
                color:"white"
            },
            right:{
                style: "thick", 
                color:"white"
            },
            left:{
                style: "thick",
                color: "white" 
            },    
            
            top:{
                style: "thick",
                color:"white"
            }
        }
});

    for (let i = 0; i < teams.length; i++) {
        let sheet = wb.addWorksheet(teams[i].name);
        sheet.cell(1, 1).string('Opponent').style(style);
        sheet.cell(1, 2).string('Self Score').style(style);
        sheet.cell(1, 3).string('Opponent Score').style(style);
        sheet.cell(1, 4).string('Result').style(style);
        
        for (let j = 0; j < teams[i].matches.length; j++) {
            sheet.cell(j + 2, 1).string(teams[i].matches[j].vs);
            sheet.cell(j + 2, 2).string(teams[i].matches[j].selfScore);
            sheet.cell(j + 2, 3).string(teams[i].matches[j].oppScore);
            sheet.cell(j + 2, 4).string(teams[i].matches[j].result);
        }
    }
    wb.write(args.excelFile);

}

function createFolders(teams) {
    fs.mkdirSync(args.dataFolder);
    for (let i = 0; i < teams.length; i++) {
        let teamFN = path.join(args.dataFolder, teams[i].name);
        fs.mkdirSync(teamFN);

        for (let j = 0; j < teams[i].matches.length; j++) {
            let matchFileName = path.join(teamFN, teams[i].matches[j].vs + ".pdf");
            createScoreCard(teams[i].name, teams[i].matches[j], matchFileName);
        }
    }
}

function addMatchToSpecificTeam(teams, homeTeam, oppTeam, score, oppscore, finalResult, matchdesc) {
    let tidx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == homeTeam) {
            tidx = i;
            break;
        }
    }

    let team = teams[tidx];
    team.matches.push({
        name: homeTeam,
        vs: oppTeam,
        selfScore: score,
        oppScore: oppscore,
        result: finalResult,
        desc: matchdesc
    });
}


function addTeamToTeamsArrayIfMissing(teams, teamName) {
    let tidx = -1;
    for (let i = 0; i < teams.length; i++){
        if (teams[i].name == teamName){
            tidx = i; 
            break;
        }
    }

    if (tidx == -1){
        let team = {
            name: teamName,
            matches: []
        } 
        teams.push(team);
    }
}

function createScoreCard(teamName, match, matchFileName) {
    let t1 = teamName;
    let t2 = match.vs;
    let result = teamName + " " + match.result;
    let description = match.desc;
    let selfScore = match.selfScore;
    let oppscore = match.oppScore;

    let initialBytesOfPdftemplate = fs.readFileSync('pdftemplate.pdf');
    let pdfdoc = pdf.PDFDocument;
    let pdfDocKaPromise = pdfdoc.load(initialBytesOfPdftemplate);
    pdfDocKaPromise.then(function (pdfdoc) {
        let page = pdfdoc.getPage(0);
        page.drawText(description, {
            x: 220,
            y: 630,
            size: 11
        });
        page.drawText(t1, {
            x: 220,
            y: 606,
            size: 11
        });
        page.drawText(t2, {
            x: 220,
            y: 583,
            size: 11
        });
        page.drawText(selfScore, {
            x: 220,
            y: 557,
            size: 11
        });
        page.drawText(oppscore, {
            x: 220,
            y: 535,
            size: 11
        });


        page.drawText(result, {
            x: 220,
            y: 487,
            size: 11
        });

        let ChangedBytesKaPromise = pdfdoc.save();
        ChangedBytesKaPromise.then(function (finalBytes) {
            fs.writeFileSync(matchFileName, finalBytes);
        });
    });
}
