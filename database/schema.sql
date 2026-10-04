-- Database Schema for Gym Studio Membership Management

-- Users Table
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(30),
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'MEMBER', 'TRAINER')),
    avatar_url VARCHAR(255),
    emergency_contact VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Membership Plans
CREATE TABLE membership_plans (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    tier VARCHAR(50) NOT NULL, -- e.g., 'Basic', 'Gold', 'Platinum', 'VIP'
    monthly_fee DECIMAL(10, 2) NOT NULL,
    description TEXT,
    perks JSON,
    is_active BOOLEAN DEFAULT TRUE
);

-- User Memberships
CREATE TABLE memberships (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(36) NOT NULL REFERENCES membership_plans(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'PENDING', 'EXPIRED', 'SUSPENDED', 'CANCELLED')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('PAID', 'PENDING', 'OVERDUE')),
    auto_renew BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Studio Info
CREATE TABLE studio_info (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    tagline VARCHAR(255),
    address VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(150) NOT NULL,
    opening_hours JSON NOT NULL,
    amenities JSON,
    rules JSON
);

-- Studio Classes / Activities
CREATE TABLE studio_classes (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    trainer_name VARCHAR(100) NOT NULL,
    schedule_time VARCHAR(100) NOT NULL,
    capacity INT DEFAULT 20,
    room VARCHAR(50)
);

-- Member Check-ins
CREATE TABLE check_ins (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    location VARCHAR(100) DEFAULT 'Main Studio'
);
