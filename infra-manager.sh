#!/bin/bash

# AI Query Builder - Infrastructure Manager
# This script helps manage the database infrastructure

set -e

COMPOSE_FILE="docker-compose.infra.yml"

show_help() {
    echo "AI Query Builder - Infrastructure Manager"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start     - Start the database infrastructure"
    echo "  stop      - Stop the database infrastructure"
    echo "  restart   - Restart the database infrastructure"
    echo "  status    - Show status of services"
    echo "  logs      - Show logs from services"
    echo "  clean     - Stop and remove all containers and volumes"
    echo "  db-url    - Show the database connection URL"
    echo "  help      - Show this help message"
    echo ""
    echo "Services:"
    echo "  - MySQL Database: localhost:3306"
    echo "  - phpMyAdmin: http://localhost:8080"
    echo ""
}

start_infra() {
    echo "🚀 Starting database infrastructure..."
    docker-compose -f $COMPOSE_FILE up -d
    echo ""
    echo "✅ Infrastructure started!"
    echo ""
    echo "📍 Services available at:"
    echo "   MySQL Database: localhost:3306"
    echo "   phpMyAdmin: http://localhost:8080"
    echo ""
    echo "📋 Database Connection Info:"
    echo "   Host: localhost"
    echo "   Port: 3306"
    echo "   Database: query_builder"
    echo "   Username: queryuser"
    echo "   Password: querypass"
    echo ""
    echo "🔗 Full connection URL:"
    echo "   mysql://queryuser:querypass@localhost:3306/query_builder"
    echo ""
}

stop_infra() {
    echo "🛑 Stopping database infrastructure..."
    docker-compose -f $COMPOSE_FILE down
    echo "✅ Infrastructure stopped!"
}

restart_infra() {
    echo "🔄 Restarting database infrastructure..."
    docker-compose -f $COMPOSE_FILE down
    docker-compose -f $COMPOSE_FILE up -d
    echo "✅ Infrastructure restarted!"
}

show_status() {
    echo "📊 Infrastructure Status:"
    docker-compose -f $COMPOSE_FILE ps
}

show_logs() {
    echo "📝 Infrastructure Logs:"
    docker-compose -f $COMPOSE_FILE logs -f
}

clean_infra() {
    echo "🧹 Cleaning up infrastructure..."
    read -p "This will remove all containers and data. Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose -f $COMPOSE_FILE down -v --remove-orphans
        docker system prune -f
        echo "✅ Infrastructure cleaned!"
    else
        echo "❌ Operation cancelled"
    fi
}

show_db_url() {
    echo "🔗 Database Connection URL:"
    echo "mysql://queryuser:querypass@localhost:3306/query_builder"
    echo ""
    echo "💡 Copy this to your packages/backend/.env file:"
    echo "DATABASE_URL=\"mysql://queryuser:querypass@localhost:3306/query_builder\""
}

# Main command handler
case "${1:-help}" in
    start)
        start_infra
        ;;
    stop)
        stop_infra
        ;;
    restart)
        restart_infra
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    clean)
        clean_infra
        ;;
    db-url)
        show_db_url
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac