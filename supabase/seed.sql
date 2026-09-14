-- ==============================================================================
-- Syllora Phase 5: Verified Seed Dataset
-- Savitribai Phule Pune University (SPPU) - 2024 Pattern (NEP-2020)
-- Computer Engineering - Second Year (SE) - Semesters III & IV
--
-- 5 Proof-of-Concept Subjects:
-- 1. PCC-201-COM: Data Structures
-- 2. PCC-202-COM: Object Oriented programming and Computer Graphics
-- 3. PCC-203-COM: Operating Systems
-- 4. PCC-251-COM: Database Management Systems
-- 5. PCC-252-COM: Discrete Mathematics
--
-- Preserves verbatim official text, ordering, and source typographical quirks.
-- Safe and idempotent (ON CONFLICT DO UPDATE).
-- ==============================================================================

DO $seed_syllora$
DECLARE
    v_univ_id UUID;
    v_pattern_id UUID;
    v_branch_id UUID;
    v_sem3_id UUID;
    v_sem4_id UUID;
    v_sub_id UUID;
    v_unit_id UUID;
BEGIN
    -- -------------------------------------------------------------------------
    -- 1. UNIVERSITY
    -- -------------------------------------------------------------------------
    INSERT INTO universities (name, acronym)
    VALUES ('Savitribai Phule Pune University', 'SPPU')
    ON CONFLICT (acronym) DO UPDATE
        SET name = EXCLUDED.name
    RETURNING id INTO v_univ_id;

    -- -------------------------------------------------------------------------
    -- 2. PATTERN
    -- -------------------------------------------------------------------------
    INSERT INTO patterns (university_id, year_name)
    VALUES (v_univ_id, '2024 Pattern')
    ON CONFLICT (university_id, year_name) DO UPDATE
        SET year_name = EXCLUDED.year_name
    RETURNING id INTO v_pattern_id;

    -- -------------------------------------------------------------------------
    -- 3. BRANCH
    -- -------------------------------------------------------------------------
    INSERT INTO branches (pattern_id, name)
    VALUES (v_pattern_id, 'Computer Engineering')
    ON CONFLICT (pattern_id, name) DO UPDATE
        SET name = EXCLUDED.name
    RETURNING id INTO v_branch_id;

    -- -------------------------------------------------------------------------
    -- 4. SEMESTERS
    -- -------------------------------------------------------------------------
    INSERT INTO semesters (branch_id, semester_number)
    VALUES (v_branch_id, 3)
    ON CONFLICT (branch_id, semester_number) DO UPDATE
        SET semester_number = EXCLUDED.semester_number
    RETURNING id INTO v_sem3_id;

    INSERT INTO semesters (branch_id, semester_number)
    VALUES (v_branch_id, 4)
    ON CONFLICT (branch_id, semester_number) DO UPDATE
        SET semester_number = EXCLUDED.semester_number
    RETURNING id INTO v_sem4_id;

    -- =========================================================================
    -- SUBJECT 1: PCC-201-COM: Data Structures (Semester III)
    -- =========================================================================
    INSERT INTO subjects (semester_id, course_code, subject_name)
    VALUES (v_sem3_id, 'PCC-201-COM', 'Data Structures')
    ON CONFLICT (semester_id, course_code) DO UPDATE
        SET subject_name = EXCLUDED.subject_name
    RETURNING id INTO v_sub_id;

    -- Unit I
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit I', 1, 'Introduction to Data Structures and Algorithms ( 09 Hours )')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$Introduction: Introduction to Data Structures: Abstract Data Types (ADT), Linear and Non-linear, Static and Dynamic, Persistent and Ephemeral data structures$item$),
    (v_unit_id, 2, $item$Algorithms: Space complexity, Time complexity, Asymptotic notation- Big-O, Theta and Omega, finding complexity using step count method, Analysis of programming constructs-Linear, Quadratic, Cubic, Logarithmic.$item$),
    (v_unit_id, 3, $item$Algorithmic Strategies: Introduction to algorithm design strategies- Divide and Conquer, and Greedy strategy$item$),
    (v_unit_id, 4, $item$Case Study:E-commerce Product Sorting using Divide and Conquer strategy Google Calendar application using Greedy strategy$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- Unit II
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit II', 2, 'Linear Data Structures, searching and sorting ( 09 Hours )')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$Overview of Array, Array as an Abstract Data Type, Operations on Array, Storage Representation, Multidimensional Arrays[2D, nD], Sparse matrix representation using 2D Searching: Sequential Search/Linear Search, Binary Search, Fibonacci Search, and Indexed Sequential Search.$item$),
    (v_unit_id, 2, $item$Sorting: Concepts- Stability, Efficiency, and Number of Passes, Internal and External Sorting, Bubble sort, Insertion Sort, Selection Sort , Quick Sort, Merge sort$item$),
    (v_unit_id, 3, $item$Case Study : Social Network Adjacency Matrix Representing friendship connections among millions of users.$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- Unit III
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit III', 3, 'Stacks, Queues and Linked Lists (09 Hours)')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$Stacks: Stack operations, Multiple Stacks, Applications of Stack for Expression Conversion [infix, prefix and postfix], Postfix expression evaluation$item$),
    (v_unit_id, 2, $item$Queues: Queue Operations, Circular Queue, Priority Queue and its advantages and applications$item$),
    (v_unit_id, 3, $item$Linked list: Introduction of Linked Lists, Primitive Operations on Linked List- Create, Traverse, Search, Insert, Delete, Sort, and Concatenate. Types of Linked List: Singly linked, linear and Circular Linked Lists, Doubly Linked List,$item$),
    (v_unit_id, 4, $item$Case study: Implementation of Stack and Queue operations using Linked lists$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- Unit IV
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit IV', 4, 'Hashing (09 Hours)')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$Hash Table : Concepts-hash table, hash function, basic operations, bucket, collision, probe, synonym, overflow, open hashing, closed hashing, perfect hash function, load density, full table, load factor, rehashing, properties of good hash function, Collision resolution strategies- open addressing and chaining, Hash table overflow- open addressing and chaining, extendible hashing, closed addressing and separate chaining$item$),
    (v_unit_id, 2, $item$Case study : Dictionary Application using Hash Tables, Description: Implement a dictionary where words and meanings are stored and retrieved using hashing with collision resolution$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- Unit V
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit V', 5, 'Graphs and Trees (09 Hours)')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$Graphs: Basic Concepts, Storage representation, Adjacency matrix, adjacency list, Traversals-depth first and breadth first, Minimum spanning Tree, Greedy algorithms for computing minimum spanning tree- Prims and Kruskal Algorithms$item$),
    (v_unit_id, 2, $item$Trees: General tree and its representation: sequential and linked organization, Binary tree- properties, converting tree to binary tree, binary tree traversals (recursive and non-recursive) - inorder, preorder, post order, Operations on binary tree. Binary Search Tree (BST) and its operation$item$),
    (v_unit_id, 3, $item$Case study: GPS/Navigation system that models a city map as a weighted graph and applies core graph algorithms ZIP/GZIP file compression using frequency-based encoding. using Huffman tree$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- =========================================================================
    -- SUBJECT 2: PCC-202-COM: Object Oriented programming and Computer Graphics (Semester III)
    -- =========================================================================
    INSERT INTO subjects (semester_id, course_code, subject_name)
    VALUES (v_sem3_id, 'PCC-202-COM', 'Object Oriented programming and Computer Graphics')
    ON CONFLICT (semester_id, course_code) DO UPDATE
        SET subject_name = EXCLUDED.subject_name
    RETURNING id INTO v_sub_id;

    -- Unit I
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit I', 1, 'Introduction to OOP Concepts and Control Structure (09 Hours)')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$Programming paradigms - Introduction to programming paradigms, Introduction to four main Programming paradigms- procedural, object oriented, functional, and logic & rule based. Need of object-oriented programming,$item$),
    (v_unit_id, 2, $item$Fundamentals of object-oriented programming: Namespaces, objects, classes, data members, methods, messages, data encapsulation, data abstraction and information hiding, inheritance, polymorphism. Benefits of OOP, Java as object oriented programming language.$item$),
    (v_unit_id, 3, $item$Overview of Java Language: simple Java program structure: documentation section, package statement, import statements, class definition, main method class. Implementing Java Program, JVM, Data types, Primitive Types vs. Reference type, floating point numbers, operators and expressions, Java Class Libraries, Typical Java Development Environment, and Memory Concepts.$item$),
    (v_unit_id, 4, $item$Control Statements: Selection Statements: if, if-else, nested if-else, Iteration Statements: do, while, for, for-each statement, break, and continue statements$item$),
    (v_unit_id, 5, $item$Case Study: Analyze the object -oriented features in Java with other object oriented programming languages.$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- Unit II
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit II', 2, 'Introduction to Classes and Objects and Arrays (09 Hours)')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$Introduction to Classes and Objects: Defining a Class, Field declaration, method declaration and definition, instantiating an object of a Class, Accessing class members, declaring methods with multiple parameters, argument passing, object as a parameter, returning objects, assigning object reference variables, set methods and get methods, constructors, this keyword, Constructors, static methods, scope of declaration, method overloading and Java API packages.$item$),
    (v_unit_id, 2, $item$Arrays: declaring and creating arrays in Java, examples using arrays, passing arrays to methods, multidimensional arrays, variable-length argument lists, using command-line arguments.$item$),
    (v_unit_id, 3, $item$Managing I/O: Streams Byte Streams and Character Streams, Predefined Streams, Reading console Input, Writing Console Output, Print Writer class.$item$),
    (v_unit_id, 4, $item$Case Studies: Demonstrate an interactive Banking/Library management system using class, objects, array of objects$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- Unit III
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit III', 3, 'Inheritance and Polymorphism Exception Handling and Multithreading (09 Hours)')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$Inheritance: Super classes and Subclasses, protected members, relationship between super classes and subclasses, types of Inheritance, constructors in subclasses, object class.$item$),
    (v_unit_id, 2, $item$Polymorphism: Abstract classes and methods, final methods and classes, dynamic binding, polymorphism examples and Interfaces.$item$),
    (v_unit_id, 3, $item$Exception handling: fundamentals, Exception Types, Using try-catch, Multiple try-catch clauses, Nested try statements, throw, throws, finally, Built-in Exceptions$item$),
    (v_unit_id, 4, $item$MultiThreading: Java Thread Model, Main Thread, Creating a Thread , Creating Multiple Threads.$item$),
    (v_unit_id, 5, $item$Case Study ; Demonstrate online Banking/Library system using Inheritance, Exception handling and Multi-Threading concepts$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- Unit IV
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit IV', 4, 'Graphics Primitives, Scan Conversion, Windowing and Clipping (09 Hours)')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$Introduction: graphics primitives - pixel, resolution, aspect ratio, frame buffer. Display devices, applications of computer graphics.$item$),
    (v_unit_id, 2, $item$Scan conversion: Line drawing algorithms: Digital Differential Analyzer (DDA), Bresenham. Circle drawing algorithms: DDA, Bresenham, and Midpoint.$item$),
    (v_unit_id, 3, $item$Polygons: Introduction to polygon, types: convex, concave and complex. Inside test. Polygon Filling: flood fill, seed fill, scan line fill.$item$),
    (v_unit_id, 4, $item$Windowing and clipping: viewing transformations, 2-D clipping: Cohen – Sutherland algorithm line Clipping algorithm, Sutherland Hodgeman polygon clipping algorithm.$item$),
    (v_unit_id, 5, $item$Case Studies - 1) Real-Time Map Rendering in GPS Navigation Systems using Line and Circle Drawing Algorithms 2) 3D pipeline / polygonal modelling and applications$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- Unit V
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit V', 5, '2D, 3D Transformations and Projections (09 Hours)')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$2-D Transformations: 2-D transformations - Translation, Scaling, Rotation and Shear, Rotation about an arbitrary point. 3-D Transformations: 3-D transformations - Translation, Scaling, Rotation and Shear, Rotation about an arbitrary axis.$item$),
    (v_unit_id, 2, $item$Projections: Parallel (Oblique: Cavalier, Cabinet and orthographic: isometric, diametric, trimetric) and Perspective (Vanishing Points – 1 point, 2 point and 3 point)$item$),
    (v_unit_id, 3, $item$Case Studies - 1) Affine Transformations Vlab (Vlab link: https://cse19- iiith.vlabs.ac.in/exp/affine-transformation/theory.html) 2) Image augmentation in Deep learning$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- =========================================================================
    -- SUBJECT 3: PCC-203-COM: Operating Systems (Semester III)
    -- =========================================================================
    INSERT INTO subjects (semester_id, course_code, subject_name)
    VALUES (v_sem3_id, 'PCC-203-COM', 'Operating Systems')
    ON CONFLICT (semester_id, course_code) DO UPDATE
        SET subject_name = EXCLUDED.subject_name
    RETURNING id INTO v_sub_id;

    -- Unit I
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit I', 1, 'Introduction to Operating System ( 09 Hours )')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$Basics of Operating Systems: Objectives & Functions, Evolution of OS, Types of Operating Systems, OS Service, System Calls: Introduction, Types of System Calls$item$),
    (v_unit_id, 2, $item$OS structure: Layered Approach, Monolithic, Microkernel Operating Systems$item$),
    (v_unit_id, 3, $item$Introduction to Linux OS: Components of Linux system, Basic Shell commands$item$),
    (v_unit_id, 4, $item$Case studies: 1) Automating User and File Management in Linux using Shell Script 2) Demonstrating Different OS Structures (Monolithic, Layered, Microkernel OS)$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- Unit II
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit II', 2, 'Process and Thread Management ( 09 Hours )')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$Process management: Definition, types of process. Process States and Transitions diagram, Process Control Block (PCB), context switching and its impact on performance, Process Scheduling.$item$),
    (v_unit_id, 2, $item$Types of Schedulers: long term, short term, middle term, Threads: Concept of thread, Multithreading, User-level vs Kernel-level Threads.$item$),
    (v_unit_id, 3, $item$Scheduling Algorithms: Preemptive Scheduling vs Non-preemptive Scheduling, FCFS, SJF, RR, Priority Process Scheduling in UNIX and Windows$item$),
    (v_unit_id, 4, $item$Cast Studies - 1) Prepare case study on challenges for Real-time Scheduling 2)Performance Comparison of Scheduling Algorithms (FCFS vs SJF, RR vs Priority Scheduling) under different workload conditions$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- Unit III
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit III', 3, 'Interprocess Communication and Deadlock (09 Hours)')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$Concurrency: Critical section problem, Synchronization primitives (Semaphores, Mutexes, Monitors) Synchronization Problems: Producer-Consumer, Reader Writer, Dining Philosophers$item$),
    (v_unit_id, 2, $item$Inter-Process Communication (IPC): Message passing, Shared memory Deadlocks: Conditions, Prevention, Avoidance (Banker’s Algorithm), Detection, Recovery$item$),
    (v_unit_id, 3, $item$Case Studies - 1) Interprocess Communication (IPC) in a Banking System 2) Deadlock in Railway Scheduling Systems$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- Unit IV
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit IV', 4, 'Memory Management (09 Hours)')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$Introduction, Contiguous and non-contiguous, Fragmentation:Internal and External fragmentation$item$),
    (v_unit_id, 2, $item$Memory allocation strategies: First Fit, Best Fit, Worst Fit, Memory Partitioning:Fixed and Dynamic partitions$item$),
    (v_unit_id, 3, $item$Paging: Structure of page table, Segmentation.Virtual Memory: Background, Demand Paging$item$),
    (v_unit_id, 4, $item$Page Replacement: FIFO, LRU, Optimal Thrashing.$item$),
    (v_unit_id, 5, $item$Case study : Intel Premium$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- Unit V
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit V', 5, 'File and Disk Management (09 Hours)')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$File Management: File operation, Directory structure, File System structure, File Organization and Access, File Directories, File Allocation Methods,Secondary Storage Management, File Systems in Operating System (FAT, NTFS, EXT, and HFS).$item$),
    (v_unit_id, 2, $item$Disk Management: Secondary-Storage Structure - Disk structure, Disk scheduling algorithm (FIFO, SSTF, SCAN, C-SCAN, LOOK, C-LOOK), Disk reliability, Disk formatting, Boot-block, Bad blocks.$item$),
    (v_unit_id, 3, $item$Case Studies - 1) Study of Linux File System. 2) Study of Android File System.$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- =========================================================================
    -- SUBJECT 4: PCC-251-COM: Database Management Systems (Semester IV)
    -- =========================================================================
    INSERT INTO subjects (semester_id, course_code, subject_name)
    VALUES (v_sem4_id, 'PCC-251-COM', 'Database Management Systems')
    ON CONFLICT (semester_id, course_code) DO UPDATE
        SET subject_name = EXCLUDED.subject_name
    RETURNING id INTO v_sub_id;

    -- Unit I
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit I', 1, 'Introduction to Database Management System ( 09 Hours )')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$Introduction to Database Management Systems, Purpose of Database Systems, Database-System Applications, View of Data, Database Languages, Database System Structure, Enterprise Constraints$item$),
    (v_unit_id, 2, $item$Data Models, Database Design and ER Model: Entity, Attributes, Relationships, Constraints, Keys, Design Process, Entity Relationship Model, ER Diagram, Design Issues, Extended E-R Features, Converting E-R & EER diagram into tables.$item$),
    (v_unit_id, 3, $item$Case Study: Study of Architecture of any DBMS like Oracle or MySQL. Design a database schema for any problem given in previous Question Papers.$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- Unit II
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit II', 2, 'SQL and PL/SQL ( 09 Hours )')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$SQL: DDL, DML, Select Queries, String, Date and Numerical Functions, Aggregate Functions ,View, Indexes, Group by and Having Clause, Join Queries, Set, Set operation, Set membership, Nested queries, DCL, TCL$item$),
    (v_unit_id, 2, $item$PL/SQL: Control Statement, Cursor, Stored Procedure and Function, Trigger$item$),
    (v_unit_id, 3, $item$Case Study : Design and implement a Student Course Management System using SQL and PL/SQL to manage students, courses, and faculty members efficiently. The system should store and retrieve relevant data, ensuring integrity, security, and performance optimization.$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- Unit III
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit III', 3, 'Relational Database Design (09 Hours)')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$Relational Model: Basic concepts, Attributes and Domains, CODD’s Rules, Relational Integrity, Referential Integrities, Database Design: Features of Good Relational Designs, Normalization, Atomic Domains and First Normal Form, Decomposition using Functional Dependencies, 2NF, 3NF, BCNF.$item$),
    (v_unit_id, 2, $item$Case study: Design and Optimization of a Relational Database for a University Management System$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- Unit IV
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit IV', 4, 'Database Transactions (09 Hours)')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$Basic concept of a Transaction, Transaction Management, Properties of Transactions, ACID, Concept of Schedule, Serial Schedule, Serializability: Conflict and View, Cascaded Aborts, Recoverable and Non-recoverable Schedules, Concurrency Control: Need, Locking Methods.$item$),
    (v_unit_id, 2, $item$Case study : Design Online Shopping Cart Transaction Management In an e-commerce platform, multiple users simultaneously add, update, and purchase products. To ensure data consistency and reliability, the system must handle concurrent transactions effectively.$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- Unit V
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit V', 5, 'NoSQL Database (09 Hours)')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$Introduction to NoSQL Database, NoSQL data models, CAP theorem and BASE Properties, Comparative study of SQL and NoSQL, MongoDB: CRUD Operations, Indexing and Aggregation.$item$),
    (v_unit_id, 2, $item$Case study: Study NoSQL Database Selection for a Social Media Platform.$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- =========================================================================
    -- SUBJECT 5: PCC-252-COM: Discrete Mathematics (Semester IV)
    -- =========================================================================
    INSERT INTO subjects (semester_id, course_code, subject_name)
    VALUES (v_sem4_id, 'PCC-252-COM', 'Discrete Mathematics')
    ON CONFLICT (semester_id, course_code) DO UPDATE
        SET subject_name = EXCLUDED.subject_name
    RETURNING id INTO v_sub_id;

    -- Unit I
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit I', 1, 'Set and Propositions ( 09 Hours )')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$Introduction and significance of Discrete Mathematics, Propositional Logic- logic, Propositional Equivalences, Application of Propositional Logic- Translating English Sentences, Proof by Mathematical Induction and Strong Mathematical Induction. Sets– Naïve Set Theory (Cantorian Set Theory), Axiomatic Set Theory, Set Operations, Cardinality of set, Principle of inclusion and exclusion. Types of Sets – Bounded and Unbounded Sets, Diagonalization Argument, Countable and Uncountable Sets, Finite and Infinite Sets, Countably Infinite and Uncountably Infinite Sets, Power set.$item$),
    (v_unit_id, 2, $item$Case study: Know about the great philosophers- Georg Cantor, Richard Dedekind and Aristotle. Design a recommendation system using logical propositions and predicates to filter movies based on user preferences.$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- Unit II
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit II', 2, 'Relations and Functions ( 09 Hours )')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$Introduction to Relations and their Properties Representation of Relations using Matrices and Digraphs Equivalence relations, Partial orderings, Partitions, Hasse diagram, Lattices, Chains and Anti-Chains, Transitive closure and Warshall‘s algorithm.$item$),
    (v_unit_id, 2, $item$Functions: Types of Functions (Injective, Surjective, Bijective) , Composition and Inverse of Functions , Recursive Functions and Applications in Algorithms, Counting Functions and Growth of Functions$item$),
    (v_unit_id, 3, $item$Cast Study - Know about the great philosophers-Dirichlet$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- Unit III
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit III', 3, 'Introduction to Trees (09 Hours)')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$Introduction to Trees and Properties decision tree, prefix codes and Huffman coding, Applications of Trees in File Systems, cut sets, The Max flow- Min Cut Theorem in Transport network, Minimum Spanning Tree Algorithms Prims and Kruskal algorithm$item$),
    (v_unit_id, 2, $item$Case Studies - Algebraic Expression Tree, Tic-Tac-Toe Game Tree, implement a file directory system using a tree structure, allowing hierarchical organization of files and folders$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- Unit IV
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit IV', 4, 'Introduction to Graph Theory (09 Hours)')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$Graph Terminology and Special Types of Graphs, Representing Graphs and Graph Isomorphism, Connectivity, Euler and Hamilton Paths, the handshaking lemma, Single source shortest path- Dijkstra’s Algorithm, Planar Graphs, Graph Colouring$item$),
    (v_unit_id, 2, $item$Case study : Model a social media platform using directed graphs to represent relationships such as “follower” or “friend.” Three utility problem, Web Graph, Google map$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

    -- Unit V
    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit V', 5, 'Counting Principles and Algebraic Structures - (09 Hours)')
    ON CONFLICT (subject_id, unit_number) DO UPDATE
        SET unit_order = EXCLUDED.unit_order, unit_name = EXCLUDED.unit_name
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, original_order, official_text) VALUES
    (v_unit_id, 1, $item$Basic Counting Techniques: Addition and Multiplication Principles, Permutations and Combinations, Binomial Coefficients and Pascal’s Triangle, Pigeonhole Principle and its Applications, Inclusion-Exclusion Principle, Generating Functions for Counting Problems.$item$),
    (v_unit_id, 2, $item$The structure of algebra - Algebraic Systems, Semi Groups, Monoids, Groups, Homomorphism and Normal Subgroups and Congruence relations, Rings, Integral Domains and Fields.$item$),
    (v_unit_id, 3, $item$Case Studies - Study Sudoku solving algorithms and algorithm for generation of new SUDOKU. Study Hank-shake Puzzle and algorithm to solve it Calculate the number of possible password combinations given specific constraints on length, character types, and repetition$item$)
    ON CONFLICT (unit_id, original_order) DO UPDATE
        SET official_text = EXCLUDED.official_text;

END $seed_syllora$;

-- ==============================================================================
-- 8. CANONICAL PROOF-OF-CONCEPT LEARNING TOPICS (Phase 7A)
-- ==============================================================================
DO $seed_learning_topics$
DECLARE
    v_item_id UUID;
BEGIN
    -- 1. PCC-201-COM: Data Structures / Unit 1 / Item 1
    SELECT si.id INTO v_item_id
    FROM syllabus_items si
    JOIN units u ON si.unit_id = u.id
    JOIN subjects sub ON u.subject_id = sub.id
    WHERE sub.course_code = 'PCC-201-COM' AND u.unit_order = 1 AND si.original_order = 1;

    IF v_item_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM learning_topics 
            WHERE syllabus_item_id = v_item_id AND normalized_title = 'Introduction to Data Structures and Abstract Data Types'
        ) THEN
            INSERT INTO learning_topics (syllabus_item_id, normalized_title, display_order, status)
            VALUES (v_item_id, 'Introduction to Data Structures and Abstract Data Types', 1, 'published');
        END IF;
    END IF;

    -- 2. PCC-201-COM: Data Structures / Unit 4 / Item 1
    SELECT si.id INTO v_item_id
    FROM syllabus_items si
    JOIN units u ON si.unit_id = u.id
    JOIN subjects sub ON u.subject_id = sub.id
    WHERE sub.course_code = 'PCC-201-COM' AND u.unit_order = 4 AND si.original_order = 1;

    IF v_item_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM learning_topics 
            WHERE syllabus_item_id = v_item_id AND normalized_title = 'Hash Tables and Collision Resolution Strategies'
        ) THEN
            INSERT INTO learning_topics (syllabus_item_id, normalized_title, display_order, status)
            VALUES (v_item_id, 'Hash Tables and Collision Resolution Strategies', 1, 'published');
        END IF;
    END IF;

    -- 3. PCC-202-COM: OOP and Computer Graphics / Unit 1 / Item 2
    SELECT si.id INTO v_item_id
    FROM syllabus_items si
    JOIN units u ON si.unit_id = u.id
    JOIN subjects sub ON u.subject_id = sub.id
    WHERE sub.course_code = 'PCC-202-COM' AND u.unit_order = 1 AND si.original_order = 2;

    IF v_item_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM learning_topics 
            WHERE syllabus_item_id = v_item_id AND normalized_title = 'Fundamentals of Object-Oriented Programming'
        ) THEN
            INSERT INTO learning_topics (syllabus_item_id, normalized_title, display_order, status)
            VALUES (v_item_id, 'Fundamentals of Object-Oriented Programming', 1, 'published');
        END IF;
    END IF;

    -- 4. PCC-203-COM: Operating Systems / Unit 2 / Item 1
    SELECT si.id INTO v_item_id
    FROM syllabus_items si
    JOIN units u ON si.unit_id = u.id
    JOIN subjects sub ON u.subject_id = sub.id
    WHERE sub.course_code = 'PCC-203-COM' AND u.unit_order = 2 AND si.original_order = 1;

    IF v_item_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM learning_topics 
            WHERE syllabus_item_id = v_item_id AND normalized_title = 'Process Management and Process Control Block'
        ) THEN
            INSERT INTO learning_topics (syllabus_item_id, normalized_title, display_order, status)
            VALUES (v_item_id, 'Process Management and Process Control Block', 1, 'published');
        END IF;
    END IF;

    -- 5. PCC-251-COM: Database Management Systems / Unit 1 / Item 1
    SELECT si.id INTO v_item_id
    FROM syllabus_items si
    JOIN units u ON si.unit_id = u.id
    JOIN subjects sub ON u.subject_id = sub.id
    WHERE sub.course_code = 'PCC-251-COM' AND u.unit_order = 1 AND si.original_order = 1;

    IF v_item_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM learning_topics 
            WHERE syllabus_item_id = v_item_id AND normalized_title = 'Introduction to Database Management Systems'
        ) THEN
            INSERT INTO learning_topics (syllabus_item_id, normalized_title, display_order, status)
            VALUES (v_item_id, 'Introduction to Database Management Systems', 1, 'published');
        END IF;
    END IF;

    -- 6. PCC-251-COM: Database Management Systems / Unit 2 / Item 1
    SELECT si.id INTO v_item_id
    FROM syllabus_items si
    JOIN units u ON si.unit_id = u.id
    JOIN subjects sub ON u.subject_id = sub.id
    WHERE sub.course_code = 'PCC-251-COM' AND u.unit_order = 2 AND si.original_order = 1;

    IF v_item_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM learning_topics 
            WHERE syllabus_item_id = v_item_id AND normalized_title = 'Structured Query Language (SQL): DDL, DML, and Queries'
        ) THEN
            INSERT INTO learning_topics (syllabus_item_id, normalized_title, display_order, status)
            VALUES (v_item_id, 'Structured Query Language (SQL): DDL, DML, and Queries', 1, 'published');
        END IF;
    END IF;

    -- 7. PCC-252-COM: Discrete Mathematics / Unit 1 / Item 1
    SELECT si.id INTO v_item_id
    FROM syllabus_items si
    JOIN units u ON si.unit_id = u.id
    JOIN subjects sub ON u.subject_id = sub.id
    WHERE sub.course_code = 'PCC-252-COM' AND u.unit_order = 1 AND si.original_order = 1;

    IF v_item_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM learning_topics 
            WHERE syllabus_item_id = v_item_id AND normalized_title = 'Propositional Logic and Set Theory'
        ) THEN
            INSERT INTO learning_topics (syllabus_item_id, normalized_title, display_order, status)
            VALUES (v_item_id, 'Propositional Logic and Set Theory', 1, 'published');
        END IF;
    END IF;

END $seed_learning_topics$;

