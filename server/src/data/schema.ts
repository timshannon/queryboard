// Copyright 2021 Tim Shannon. All rights reserved. Use of this source code is governed by the MIT license that can be found in the LICENSE file.
/*
Always add schema updates to the bottom of the array.  Either maintain backwards compatibility, or included
scripts to update the old schema to the new schema.

# Database style guide
Follow this style guide as much as possible: https://www.sqlstyle.guide/

**tldr:** All names (table, column, variables, etc) should be lower case.  Spaces in names should be denoted by 
underscores `_`. Table names should always refer to collective name. Column names should be atomic and refer to the 
individual and specific item.

## Common Column Data Types

* Unique IDs - UUID stored as TEXT 
* Dates - REAL

## Nulls vs Defaults
Nulls mean a value was not provided. Most of the time you'll want to use a null, not a default.

Consider the field `password_expiration`.  If you don't want the password to expire, the value should be null not some 
arbitrarily large or small number.

Don't rely on database defaults to populate data, instead populate them via default behaviors in code.

## Foreign Keys
Foreign Keys are important, not only for describing the relationship between tables, but also for enforcing the 
integrity of those relationships.  They come at a small, but worthwhile cost to performance.

Make sure you describe how tables relate with foreign keys.

*/

export default {
    system: { // system tables, users, settings, etc
        scripts: [],
    },
    board: { // template for creating / updating query board databases
        scripts: [],
    },
};

