# Brazuca RD - Domain Driven Design Architecture

This project has been refactored to follow **Domain Driven Design (DDD)** principles, providing a clean, maintainable, and scalable architecture.

## 🏗️ Architecture Overview

The application is organized into distinct layers following DDD principles:

```
src/
├── domains/                 # Domain Layer (Business Logic)
│   ├── realdebrid/         # Real-Debrid Bounded Context
│   ├── source/             # Source Bounded Context  
│   ├── stream/             # Stream Bounded Context
│   └── configuration/      # Configuration Bounded Context
├── application/            # Application Layer (Use Cases)
│   ├── services.ts         # Application Services
│   └── dtos.ts            # Data Transfer Objects
├── infrastructure/         # Infrastructure Layer (External Concerns)
│   ├── repositories.ts    # Repository Implementations
│   ├── http.ts            # HTTP Server Infrastructure
│   └── container.ts       # Dependency Injection Container
├── server.ts              # Original Server (Legacy)
└── server-ddd.ts          # New DDD Server Entry Point
```

## 🎯 Domain Bounded Contexts

### 1. **Real-Debrid Domain** (`domains/realdebrid/`)
- **Entities**: `Torrent`, `TorrentFile`, `TorrentId`, `FileId`
- **Value Objects**: `RealDebridToken`, `MagnetLink`, `DirectDownloadUrl`
- **Domain Services**: `TorrentProcessingService`, `FileSelectionService`
- **Repository Interface**: `ITorrentRepository`

**Business Rules**:
- Torrents must have video files to be processed
- Always select the largest video file for streaming
- Processing has configurable timeouts and polling intervals

### 2. **Source Domain** (`domains/source/`)
- **Entities**: `Source`, `Stream`, `ContentId`
- **Value Objects**: `SourceUrl`, `StreamQuality`, `FileSize`, `SeederCount`
- **Domain Services**: `StreamProcessingService`, `StreamValidationService`
- **Repository Interface**: `ISourceRepository`

**Business Rules**:
- Prefer streams with better seeding
- Validate stream quality and availability
- Support multiple source addons

### 3. **Stream Domain** (`domains/stream/`)
- **Aggregate**: `StreamAggregate` (Main business entity)
- **Value Objects**: `StreamRequest`, `StreamResponse`, `StreamMetadata`
- **Domain Services**: `StreamProcessingDomainService`, `StreamBusinessRulesService`
- **Enums**: `StreamProcessingStatus`

**Business Rules**:
- Complete stream processing workflow
- Business rule validation
- Processing metrics and monitoring

### 4. **Configuration Domain** (`domains/configuration/`)
- **Aggregate**: `ApplicationConfig`
- **Value Objects**: `Port`, `LogLevel`, `SourceUrlList`
- **Factory**: `ConfigurationFactory`

**Business Rules**:
- Configuration validation
- Environment-based configuration loading

## 🔄 Application Layer

### Application Services
- **`StreamApplicationService`**: Main use case for stream processing
- **`ConfigurationApplicationService`**: Configuration management
- **`HealthApplicationService`**: Health checks and monitoring

### DTOs (Data Transfer Objects)
- **`StreamRequestDTO`**: Input for stream processing
- **`StreamResponseDTO`**: Output for Stremio API
- **`ConfigurationDTO`**: Configuration data transfer
- **`HealthCheckDTO`**: Health check responses

## 🏭 Infrastructure Layer

### Repositories
- **`RealDebridRepository`**: Real-Debrid API implementation
- **`SourceRepository`**: Source addon API implementation

### HTTP Infrastructure
- **`HttpServer`**: Fastify-based HTTP server
- Route handlers for all endpoints
- CORS configuration
- HTML generation for configuration pages

### Dependency Injection
- **`ApplicationContainer`**: Manages all dependencies
- Wire-up between layers
- Configuration initialization

## 🚀 Usage

### Development with DDD Architecture
```bash
npm run dev:ddd
```

### Production Build
```bash
npm run build:ddd
npm run start:ddd
```

### Legacy Server (Original)
```bash
npm run dev      # Development
npm run build    # Build
npm run start    # Production
```

## 🎨 DDD Benefits

### ✅ **Separation of Concerns**
- Business logic isolated in domain layer
- Infrastructure concerns separated
- Clear boundaries between layers

### ✅ **Maintainability**
- Each bounded context has single responsibility
- Easy to modify business rules
- Clear interfaces between components

### ✅ **Testability**
- Domain logic can be tested in isolation
- Repository interfaces enable mocking
- Application services are pure functions

### ✅ **Scalability**
- Easy to add new bounded contexts
- Infrastructure can be swapped out
- Clear extension points

### ✅ **Domain Focus**
- Business rules are explicit and documented
- Domain experts can understand the code
- Ubiquitous language throughout

## 🔧 Key DDD Patterns Used

1. **Entities**: `Torrent`, `Stream`, `Source`
2. **Value Objects**: `TorrentId`, `MagnetLink`, `Port`
3. **Aggregates**: `StreamAggregate`, `ApplicationConfig`
4. **Domain Services**: Business logic that doesn't belong to entities
5. **Repositories**: Data access abstraction
6. **Factories**: Object creation logic
7. **Specifications**: Business rule validation

## 📊 Architecture Comparison

| Aspect | Original | DDD Architecture |
|--------|----------|------------------|
| **Organization** | Monolithic files | Bounded contexts |
| **Business Logic** | Mixed with infrastructure | Isolated in domain |
| **Testability** | Hard to test | Easy to unit test |
| **Maintainability** | Tightly coupled | Loosely coupled |
| **Extensibility** | Hard to extend | Easy to extend |
| **Domain Focus** | Technical focus | Business focus |

## 🎯 Next Steps

The DDD architecture provides a solid foundation for:
- Adding new torrent sources
- Implementing caching strategies
- Adding monitoring and metrics
- Creating admin interfaces
- Scaling to multiple instances

This architecture ensures the codebase remains maintainable and aligned with business requirements as it grows.
