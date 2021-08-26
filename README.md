# queryboard
A dashboard for querying and manipulating table datasets

## Overview
The goal Queryboard is to have a tool where you can quickly and easily import datasets from many different sources and
query them or manipulate them in various ways.

A new queryboard will create a single SQLite database. You can then import files (csv, excel, json, text, etc) or open a URL
and queryboard will parse the webpage looking for structured data, and create SQLite tables from the data.

From there you can query and join the data, easily create new tables from your queries, create graphs of the data, and
export the database back out to csv, json, excel, or just download the whole SQlite database.

There will be two versions: a self hosted docker web app and a standalone electron desktop application.

