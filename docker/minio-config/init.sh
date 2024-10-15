#!/bin/sh

# Check if the configuration has already been applied
if [ ! -f /etc/minio/config_applied ]; then
    echo "Setting up MinIO configuration..."

    # Create buckets
    mkdir -p /data/interop-tracing-bucket /data/interop-tracing-enriched-bucket

    # Start MinIO server in the background (compatibility mode)
    /usr/bin/minio server /data --console-address ":9001" --compat &

    # Wait for MinIO to be ready
    sleep 10

    # Set mc alias
    while ! mc alias set myminio http://localhost:9000 test-aws-key test-aws-secret; do
        echo "Waiting for MinIO to be ready..."
        sleep 5
    done

    # Import MinIO configuration
    mc admin config import myminio < /etc/minio/minio.conf

    # Restart MinIO service to apply the configuration
    echo "Restarting MinIO service to apply the new configuration..."
    mc admin service restart myminio

    # Wait for MinIO to restart
    sleep 10

    # Create a flag file to indicate the config was applied
    touch /etc/minio/config_applied

    echo "MinIO configuration completed."

    # Add event subscriptions
    echo "Subscribing to events..."

    if ! mc event add myminio/interop-tracing-bucket arn:minio:sqs:eu-central-1:interop-tracing-bucket:webhook --event put --suffix .csv --ignore-existing; then
        echo "Failed to add event subscription for interop-tracing-bucket."
    fi

    if ! mc event add myminio/interop-tracing-enriched-bucket arn:minio:sqs:eu-central-1:interop-tracing-enriched-bucket:webhook --event put --suffix .csv --ignore-existing; then
        echo "Failed to add event subscription for interop-tracing-enriched-bucket."
    fi
else
    echo "MinIO configuration already applied, skipping setup."
    
    # Start MinIO server in the background (compatibility mode)
    /usr/bin/minio server /data --console-address ":9001" --compat
fi

# Wait for MinIO server to remain active
wait
