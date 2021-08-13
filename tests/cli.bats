setup() {
    load './node_modules/bats-support/load.bash'
    load './node_modules/bats-assert/load.bash'
}

teardown() {
    rm -rf berkala.yml
}

@test "can run with an empty config" {
    rm -rf berkala.yml
    touch berkala.yml
    run ./dist/berkala
    assert_success
    assert_output --partial 'Berkala 1.2'
}

@test "will not create a config file automatically in non-interactive tty" {
    rm -rf berkala.yml
    run export CI=true
    run ./dist/berkala
    assert_failure 255
}