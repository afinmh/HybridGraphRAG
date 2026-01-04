# Code Architecture - Hybrid Graph RAG System

## 📁 Project Structure

```
sumberherbal/
├── app/api/                    # API Routes (thin layer)
│   ├── upload/route.ts        # PDF upload & metadata extraction (86 lines)
│   ├── extract-graph/route.ts # Graph extraction orchestration (48 lines)
│   └── save-to-db/route.ts    # Database save orchestration (52 lines)
│
├── services/                   # Business Logic Layer
│   └── mistral.service.ts     # Mistral LLM interactions (218 lines)
│
├── repositories/               # Data Access Layer
│   └── journal.repository.ts  # Database operations (301 lines)
│
└── lib/                        # Utility Functions
    ├── graph-utils.ts         # Entity/relation processing (114 lines)
    └── text-utils.ts          # Text cleaning utilities (141 lines)
```

## 🏗️ Architecture Layers

### 1. **API Routes** (`app/api/`)
**Responsibility:** Thin orchestration layer
- Validate request input
- Call services/repositories
- Format responses
- Handle HTTP errors

**Files:**
- `upload/route.ts` - PDF processing endpoint
- `extract-graph/route.ts` - Graph extraction endpoint
- `save-to-db/route.ts` - Database persistence endpoint

### 2. **Services** (`services/`)
**Responsibility:** Business logic and external API interactions
- LLM API calls (Mistral)
- Complex processing workflows
- Batch operations

**Files:**
- `mistral.service.ts` - Mistral LLM service
  - `extractMetadataWithLLM()` - Extract title, author, year from PDF
  - `extractGraphFromChunk()` - Extract entities & relations from text chunk
  - `extractGraphsInBatches()` - Parallel batch processing

### 3. **Repositories** (`repositories/`)
**Responsibility:** Database operations (Supabase)
- CRUD operations
- Data mapping
- Transaction handling

**Files:**
- `journal.repository.ts` - Journal data operations
  - `insertJournal()` - Create journal record
  - `insertEmbeddings()` - Save vector embeddings
  - `insertEntities()` - Save knowledge graph entities
  - `insertRelations()` - Save entity relationships
  - `saveToDatabase()` - Main orchestration function

### 4. **Libraries** (`lib/`)
**Responsibility:** Reusable utility functions
- Pure functions (no side effects)
- Domain-agnostic helpers
- Data transformations

**Files:**
- `graph-utils.ts` - Entity/relation utilities
  - `normalizeEntityName()` - Normalize for deduplication
  - `filterEntity()` - Remove noise entities
  - `deduplicateEntities()` - Remove duplicate entities
  - `filterRelationsByEntities()` - Validate relations
  - `deduplicateRelations()` - Remove duplicate relations

- `text-utils.ts` - Text processing utilities
  - `cleanAcademicText()` - Remove headers/footers/metadata
  - `parseJSONResponse()` - Parse LLM JSON with fallback

## 🔄 Data Flow

### Upload Flow
```
User uploads PDF
    ↓
API Route (upload/route.ts)
    ↓
mistral.service.ts → extractMetadataWithLLM()
    ↓
text-utils.ts → cleanAcademicText()
    ↓
Return: cleanedText + metadata
```

### Graph Extraction Flow
```
User sends chunks
    ↓
API Route (extract-graph/route.ts)
    ↓
mistral.service.ts → extractGraphsInBatches()
    ├─ extractGraphFromChunk() (parallel batches of 5)
    ├─ graph-utils.ts → filterEntity()
    └─ graph-utils.ts → filterRelationsByEntities()
    ↓
Return: entities + relations per chunk
```

### Database Save Flow
```
User sends: metadata + chunks + vectors + graphs
    ↓
API Route (save-to-db/route.ts)
    ↓
journal.repository.ts → saveToDatabase()
    ├─ insertJournal()
    ├─ insertEmbeddings()
    ├─ insertEntities()
    │   └─ graph-utils.ts → deduplicateEntities()
    └─ insertRelations()
        └─ graph-utils.ts → deduplicateRelations()
    ↓
Return: journalId + counts
```

## ✅ Benefits of This Architecture

### 1. **Separation of Concerns**
- API routes only handle HTTP
- Services contain business logic
- Repositories handle data access
- Libraries provide reusable utilities

### 2. **Testability**
- Each layer can be tested independently
- Mock services/repositories in tests
- Pure functions in lib/ easy to unit test

### 3. **Maintainability**
- Clear file organization
- Single Responsibility Principle
- Easy to locate and modify code

### 4. **Reusability**
- Services can be used by multiple API routes
- Utilities can be used anywhere
- Repositories can be called from services or APIs

### 5. **Scalability**
- Easy to add new endpoints
- Easy to add new data sources
- Easy to swap implementations (e.g., different LLM provider)

## 🔧 How to Add New Features

### Add New LLM Operation
1. Create function in `services/mistral.service.ts`
2. Use in API route
3. Add utility functions to `lib/` if needed

### Add New Database Table
1. Create new repository file `repositories/new-table.repository.ts`
2. Add CRUD functions
3. Call from API routes

### Add New API Endpoint
1. Create new route file `app/api/new-endpoint/route.ts`
2. Call services/repositories
3. Return standardized response

## 📝 Code Size Comparison

### Before Refactoring
- `upload/route.ts` - 287 lines ❌
- `extract-graph/route.ts` - 247 lines ❌
- `save-to-db/route.ts` - 301 lines ❌
- **Total:** 835 lines in 3 files

### After Refactoring
- **API Routes:** 186 lines (3 files) ✅
- **Services:** 218 lines (1 file) ✅
- **Repositories:** 301 lines (1 file) ✅
- **Libraries:** 255 lines (2 files) ✅
- **Total:** 960 lines in 7 files

**Result:** More organized, more maintainable, more testable!

## 🚀 Next Steps

1. ✅ Refactored code structure
2. ⏳ Add unit tests for services/repositories/utilities
3. ⏳ Add integration tests for API routes
4. ⏳ Add error handling middleware
5. ⏳ Add request validation with Zod
6. ⏳ Add API documentation with Swagger
