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
    assert_output --partial 'Berkala 1.3'
}

@test "will not create a config file automatically in non-interactive tty" {
    rm -rf berkala.yml
    run export CI=true
    run ./dist/berkala
    assert_failure 255
}

@test "must run a command" {
    rm -rf ./must_exist.txt ./first-file.txt ./second-file.txt
    cp tests/test-run.yml berkala.yml
    run ./dist/berkala
    run cat ./must_exist.txt
    run cat ./first_file.txt
    run cat ./second_file.txt
    assert_success
}

@test "must support timeout" {
    rm -rf ./must_exist.txt ./must_not_exist.txt
    cp tests/test-timeout.yml berkala.yml
    run ./dist/berkala
    run cat ./must_exist.txt
    assert_success
    run cat ./must_not_exist.txt
    assert_failure
}
